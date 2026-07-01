const getEnv = (name, fallback = '') => {
    const value = process.env[name]
    return value === undefined || value === null || value === '' ? fallback : value.trim()
}

const normalizeOrigin = (origin) => String(origin || '').trim().replace(/\/$/, '')

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const createOriginMatcher = (originPattern) => {
    const normalizedPattern = normalizeOrigin(originPattern)
    if (!normalizedPattern.includes('*')) return (origin) => origin === normalizedPattern

    const regex = new RegExp(`^${normalizedPattern.split('*').map(escapeRegExp).join('.*')}$`)
    return (origin) => regex.test(origin)
}

const defaultClientOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://e-commerce-website.vercel.app',
    'https://e-commerce-website-*.vercel.app'
]

const parseOrigins = (value) => String(value || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)

const validateEnvironment = () => {
    const required = ['MONGO_URL', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']
    const missing = required.filter((name) => !getEnv(name))

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }

    if (getEnv('JWT_SECRET').length < 32) {
        throw new Error('JWT_SECRET must contain at least 32 characters')
    }

}

const configuredClientOrigins = parseOrigins(getEnv('CLIENT_ORIGINS'))
const publicClientUrl = normalizeOrigin(getEnv('PUBLIC_CLIENT_URL'))
    || configuredClientOrigins.find((origin) => origin.startsWith('https://') && !origin.includes('*'))
    || defaultClientOrigins.find((origin) => origin.startsWith('https://') && !origin.includes('*'))
    || defaultClientOrigins[0]

const env = {
    nodeEnv: getEnv('NODE_ENV', 'development'),
    port: Number(getEnv('PORT', '4000')),
    clientOrigins: [...new Set([...defaultClientOrigins, ...configuredClientOrigins])],
    publicClientUrl,
    storeCurrency: getEnv('STORE_CURRENCY', 'inr').toLowerCase(),
    deliveryCharge: Number(getEnv('DELIVERY_CHARGE', '10')),
    isProduction: getEnv('NODE_ENV', 'development') === 'production'
}

const clientOriginMatchers = env.clientOrigins.map(createOriginMatcher)

const isAllowedClientOrigin = (origin) => {
    if (!origin) return true
    return clientOriginMatchers.some((matchesOrigin) => matchesOrigin(normalizeOrigin(origin)))
}

const defaultClientOrigin = env.clientOrigins.find((origin) => !origin.includes('*')) || env.clientOrigins[0]

export { env, getEnv, validateEnvironment, isAllowedClientOrigin, defaultClientOrigin }
