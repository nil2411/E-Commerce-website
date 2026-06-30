import mongoose from 'mongoose'

let connectionPromise

const getMongoUri = () => {
    const configuredUri = process.env.MONGO_URL?.trim()
    if (!configuredUri) throw Object.assign(new Error('MONGO_URL is not configured'), { status: 503 })

    const base = configuredUri.replace(/\/$/, '')
    const hasDatabase = /mongodb(?:\+srv)?:\/\/[^/]+\/[^?]+/.test(base)
    return hasDatabase ? base : `${base}/ecommerce`
}

const connectDb = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection

    if (!connectionPromise) {
        mongoose.connection.once('connected', () => {
            console.log('DB Connected')
        })

        connectionPromise = mongoose.connect(getMongoUri()).catch((error) => {
            connectionPromise = undefined
            throw error
        })
    }

    return connectionPromise

}

const disconnectDb = () => {
    connectionPromise = undefined
    return mongoose.disconnect()
}

export { connectDb, disconnectDb };
