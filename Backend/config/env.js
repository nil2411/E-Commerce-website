const getEnv = (name, fallback = '') => {
    const value = process.env[name]
    return value === undefined || value === null || value === '' ? fallback : value.trim()
}

const validateEnvironment = () => {
    const required = ['MONGO_URL', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']
    const missing = required.filter((name) => !getEnv(name))

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }

    if (getEnv('JWT_SECRET').length < 32) {
        throw new Error('JWT_SECRET must contain at least 32 characters')
    }

    if (process.env.NODE_ENV === 'production' && !getEnv('CLIENT_ORIGINS')) {
        throw new Error('CLIENT_ORIGINS is required in production')
    }
}

const env = {
    nodeEnv: getEnv('NODE_ENV', 'development'),
    port: Number(getEnv('PORT', '4000')),
    clientOrigins: getEnv('CLIENT_ORIGINS', 'http://localhost:5173,http://localhost:5174')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    storeCurrency: getEnv('STORE_CURRENCY', 'inr').toLowerCase(),
    deliveryCharge: Number(getEnv('DELIVERY_CHARGE', '10')),
    isProduction: getEnv('NODE_ENV', 'development') === 'production'
}

export { env, getEnv, validateEnvironment }

