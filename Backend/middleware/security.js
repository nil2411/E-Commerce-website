import crypto from 'crypto'
import { env } from '../config/env.js'

const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
    if (env.isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    next()
}

const requestLogger = (req, res, next) => {
    const startedAt = Date.now()
    req.id = req.headers['x-request-id'] || crypto.randomUUID()
    res.setHeader('X-Request-Id', req.id)

    res.on('finish', () => {
        const entry = {
            level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
            requestId: req.id,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs: Date.now() - startedAt
        }
        console.log(JSON.stringify(entry))
    })
    next()
}

const createRateLimiter = ({ windowMs, max, message }) => {
    const attempts = new Map()

    return (req, res, next) => {
        const now = Date.now()
        const key = `${req.ip}:${req.path}`
        const current = attempts.get(key)

        if (!current || current.resetAt <= now) {
            attempts.set(key, { count: 1, resetAt: now + windowMs })
            return next()
        }

        current.count += 1
        if (current.count > max) {
            res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000))
            return res.status(429).json({ success: false, message })
        }

        if (attempts.size > 10_000) {
            for (const [attemptKey, value] of attempts) {
                if (value.resetAt <= now) attempts.delete(attemptKey)
            }
        }
        next()
    }
}

const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many authentication attempts. Please try again later.'
})

const apiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 180,
    message: 'Too many requests. Please slow down.'
})

export { securityHeaders, requestLogger, authRateLimiter, apiRateLimiter }

