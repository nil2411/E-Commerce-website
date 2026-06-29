import jwt from 'jsonwebtoken'

const getTokenFromRequest = (req) => {
    const authorization = req.headers.authorization
    if (authorization?.startsWith('Bearer ')) return authorization.slice(7)
    const raw = req.headers.token ?? req.headers['token']
    if (!raw) return null
    return Array.isArray(raw) ? raw[0] : raw
}

const authUser = async (req, res, next) => {
    const token = getTokenFromRequest(req)
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not Authorized Login Again' })
    }
    try {
        const token_decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (token_decoded.type !== 'access' || token_decoded.role !== 'user') {
            return res.status(401).json({ success: false, message: 'Invalid access token' })
        }
        req.user = { id: String(token_decoded.id), role: 'user' }
        req.body = req.body || {}
        req.body.userId = req.user.id
        next()
    } catch (error) {
        console.log(error)
        res.status(401).json({ success: false, message: 'Session expired. Please log in again.' })
    }
}

export default authUser
