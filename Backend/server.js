import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import 'dotenv/config'
import { fileURLToPath } from 'url'
import { connectDb, disconnectDb } from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import productModel from './models/productmodel.js'
import userRoutes from './routes/userroutes.js'
import productRoutes from './routes/productroutes.js'
import adminRoutes from './routes/adminroutes.js'
import cartRouter from './routes/cartroutes.js'
import orderRouter from './routes/orderRoutes.js'
import { stripeWebhook, razorpayWebhook } from './controllers/orderControllerV2.js'
import { env, validateEnvironment } from './config/env.js'
import { apiRateLimiter, requestLogger, securityHeaders } from './middleware/security.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { releaseExpiredReservations } from './services/orderService.js'

const app = express()
app.disable('x-powered-by')
app.use(requestLogger)
app.use(securityHeaders)

let server
let reservationTimer
let servicesReadyPromise
let cloudinaryConfigured = false

const initializeServices = async () => {
    if (!servicesReadyPromise) {
        servicesReadyPromise = (async () => {
            validateEnvironment()
            if (!cloudinaryConfigured) {
                connectCloudinary()
                cloudinaryConfigured = true
            }
            await connectDb()
            await productModel.updateMany({ stock: { $exists: false } }, { $set: { stock: 50, active: true } })
            await releaseExpiredReservations()
        })().catch((error) => {
            servicesReadyPromise = undefined
            throw error
        })
    }

    return servicesReadyPromise
}

const ensureServicesReady = async (req, res, next) => {
    try {
        await initializeServices()
        next()
    } catch (error) {
        next(error)
    }
}

app.get('/', (req, res) => res.json({ success: true, message: 'Forever Store API' }))
app.get('/health', async (req, res, next) => {
    try {
        await initializeServices()
        const databaseReady = mongoose.connection.readyState === 1
        res.status(databaseReady ? 200 : 503).json({
            success: databaseReady,
            status: databaseReady ? 'healthy' : 'degraded',
            database: databaseReady ? 'connected' : 'disconnected',
            uptimeSeconds: Math.floor(process.uptime())
        })
    } catch (error) {
        next(error)
    }
})

// Payment providers require the exact raw bytes to verify webhook signatures.
app.post('/order/webhook/stripe', express.raw({ type: 'application/json', limit: '1mb' }), ensureServicesReady, stripeWebhook)
app.post('/order/webhook/razorpay', express.raw({ type: 'application/json', limit: '1mb' }), ensureServicesReady, razorpayWebhook)

app.use(cors({
    origin(origin, callback) {
        if (!origin || env.clientOrigins.includes(origin)) return callback(null, true)
        callback(Object.assign(new Error('Origin is not allowed by CORS'), { status: 403 }))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'token', 'X-Request-Id']
}))
app.use(express.json({ limit: '1mb' }))
app.use(apiRateLimiter)
app.use(ensureServicesReady)

app.use('/user', userRoutes)
app.use('/products', productRoutes)
app.use('/admin', adminRoutes)
app.use('/cart', cartRouter)
app.use('/order', orderRouter)

app.use(notFound)
app.use(errorHandler)

const startServer = async () => {
    await initializeServices()

    server = app.listen(env.port, () => {
        console.log(JSON.stringify({ level: 'info', message: 'Server started', port: env.port, environment: env.nodeEnv }))
    })
    reservationTimer = setInterval(() => {
        releaseExpiredReservations().catch((error) => console.error(JSON.stringify({ level: 'error', message: error.message })))
    }, 5 * 60 * 1000)
    reservationTimer.unref()
    return server
}

const shutdown = async (signal) => {
    console.log(JSON.stringify({ level: 'info', message: 'Graceful shutdown started', signal }))
    if (reservationTimer) clearInterval(reservationTimer)
    if (server) await new Promise((resolve) => server.close(resolve))
    await disconnectDb()
}

if (!process.env.VERCEL && process.argv[1] === fileURLToPath(import.meta.url)) {
    startServer().catch((error) => {
        console.error(JSON.stringify({ level: 'error', message: error.message, stack: error.stack }))
        process.exitCode = 1
    })
    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, () => shutdown(signal).finally(() => process.exit(0)))
    }
}

export default app
export { app, startServer, shutdown, initializeServices }
