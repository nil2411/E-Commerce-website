import crypto from 'crypto'
import validator from 'validator'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import userModel from '../models/usermodel.js'
import { env } from '../config/env.js'
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService.js'

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

const createAccessToken = ({ id, role = 'user' }) => jwt.sign(
    { id: String(id), role, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: role === 'admin' ? '8h' : '1h' }
)

const createRefreshToken = (id) => jwt.sign(
    { id: String(id), role: 'user', type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
)

const parseCookies = (req) => Object.fromEntries(
    String(req.headers.cookie || '')
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const index = part.indexOf('=')
            return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))]
        })
)

const setRefreshCookie = (res, token) => {
    const attributes = [
        `refreshToken=${encodeURIComponent(token)}`,
        'HttpOnly',
        'Path=/',
        'Max-Age=604800',
        env.isProduction ? 'SameSite=None' : 'SameSite=Lax'
    ]
    if (env.isProduction) attributes.push('Secure')
    res.setHeader('Set-Cookie', attributes.join('; '))
}

const issueSession = (res, user) => {
    const token = createAccessToken({ id: user._id, role: 'user' })
    setRefreshCookie(res, createRefreshToken(user._id))
    return token
}

const userLogin = async (req, res, next) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase()
        const password = String(req.body.password || '')
        const user = await userModel.findOne({ email })
        const valid = user && await bcrypt.compare(password, user.password)
        if (!valid) throw Object.assign(new Error('Invalid email or password'), { status: 401 })

        const token = issueSession(res, user)
        res.json({ success: true, token, user: { name: user.name, email: user.email, emailVerified: user.emailVerified } })
    } catch (error) {
        next(error)
    }
}

const userRegister = async (req, res, next) => {
    try {
        const name = String(req.body.name || '').trim()
        const email = String(req.body.email || '').trim().toLowerCase()
        const password = String(req.body.password || '')
        if (name.length < 2 || name.length > 80) throw Object.assign(new Error('Name must contain 2 to 80 characters'), { status: 400 })
        if (!validator.isEmail(email)) throw Object.assign(new Error('Enter a valid email address'), { status: 400 })
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            throw Object.assign(new Error('Password must have at least 8 characters, including a letter and number'), { status: 400 })
        }
        if (await userModel.exists({ email })) throw Object.assign(new Error('An account with this email already exists'), { status: 409 })

        const verificationToken = crypto.randomBytes(32).toString('hex')
        const user = await userModel.create({
            name,
            email,
            password: await bcrypt.hash(password, 12),
            emailVerificationToken: hashToken(verificationToken),
            emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
        })
        const token = issueSession(res, user)
        sendVerificationEmail({ email, name, token: verificationToken, clientUrl: env.clientOrigins[0] }).catch(console.error)

        res.status(201).json({
            success: true,
            token,
            message: 'Account created. Check your email to verify it.',
            verificationToken: env.isProduction ? undefined : verificationToken
        })
    } catch (error) {
        if (error?.code === 11000) error = Object.assign(new Error('An account with this email already exists'), { status: 409 })
        next(error)
    }
}

const refreshSession = async (req, res, next) => {
    try {
        const refreshToken = parseCookies(req).refreshToken
        if (!refreshToken) throw Object.assign(new Error('Refresh session is missing'), { status: 401 })
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)
        if (decoded.type !== 'refresh' || decoded.role !== 'user') throw new Error('Invalid refresh session')
        const user = await userModel.findById(decoded.id)
        if (!user) throw new Error('Account no longer exists')
        const token = issueSession(res, user)
        res.json({ success: true, token })
    } catch (error) {
        error.status = 401
        next(error)
    }
}

const logout = (req, res) => {
    res.setHeader('Set-Cookie', `refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=${env.isProduction ? 'None; Secure' : 'Lax'}`)
    res.json({ success: true, message: 'Logged out' })
}

const adminLogin = async (req, res, next) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase()
        const password = String(req.body.password || '')
        const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
        const expectedPassword = process.env.ADMIN_PASSWORD || ''
        const emailMatches = email.length === expectedEmail.length && crypto.timingSafeEqual(Buffer.from(email), Buffer.from(expectedEmail))
        const passwordMatches = password.length === expectedPassword.length && crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expectedPassword))
        if (!emailMatches || !passwordMatches) throw Object.assign(new Error('Invalid admin credentials'), { status: 401 })

        const token = createAccessToken({ id: expectedEmail, role: 'admin' })
        res.json({ success: true, token, message: 'Admin logged in successfully' })
    } catch (error) {
        next(error)
    }
}

const verifyEmail = async (req, res, next) => {
    try {
        const token = hashToken(String(req.body.token || ''))
        const user = await userModel.findOne({ emailVerificationToken: token, emailVerificationExpires: { $gt: new Date() } })
        if (!user) throw Object.assign(new Error('Verification link is invalid or expired'), { status: 400 })
        user.emailVerified = true
        user.emailVerificationToken = undefined
        user.emailVerificationExpires = undefined
        await user.save()
        res.json({ success: true, message: 'Email verified' })
    } catch (error) {
        next(error)
    }
}

const forgotPassword = async (req, res, next) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase()
        const user = await userModel.findOne({ email })
        let resetToken
        if (user) {
            resetToken = crypto.randomBytes(32).toString('hex')
            user.passwordResetToken = hashToken(resetToken)
            user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000)
            await user.save()
            await sendPasswordResetEmail({ email, token: resetToken, clientUrl: env.clientOrigins[0] })
        }
        res.json({
            success: true,
            message: 'If that account exists, a reset link has been sent.',
            resetToken: env.isProduction ? undefined : resetToken
        })
    } catch (error) {
        next(error)
    }
}

const resetPassword = async (req, res, next) => {
    try {
        const password = String(req.body.password || '')
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            throw Object.assign(new Error('Password must have at least 8 characters, including a letter and number'), { status: 400 })
        }
        const user = await userModel.findOne({
            passwordResetToken: hashToken(String(req.body.token || '')),
            passwordResetExpires: { $gt: new Date() }
        })
        if (!user) throw Object.assign(new Error('Reset link is invalid or expired'), { status: 400 })
        user.password = await bcrypt.hash(password, 12)
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined
        await user.save()
        res.json({ success: true, message: 'Password reset successfully' })
    } catch (error) {
        next(error)
    }
}

const getProfile = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user.id).select('-password -cartData -emailVerificationToken -passwordResetToken')
        if (!user) throw Object.assign(new Error('Account not found'), { status: 404 })
        res.json({ success: true, user })
    } catch (error) {
        next(error)
    }
}

const updateProfile = async (req, res, next) => {
    try {
        const name = String(req.body.name || '').trim()
        if (name.length < 2 || name.length > 80) throw Object.assign(new Error('Name must contain 2 to 80 characters'), { status: 400 })
        const addresses = Array.isArray(req.body.addresses) ? req.body.addresses.slice(0, 5) : []
        const user = await userModel.findByIdAndUpdate(req.user.id, {
            name,
            phone: String(req.body.phone || '').trim().slice(0, 30),
            addresses
        }, { new: true, runValidators: true }).select('-password -cartData')
        res.json({ success: true, user, message: 'Profile updated' })
    } catch (error) {
        next(error)
    }
}

export {
    userLogin,
    userRegister,
    refreshSession,
    logout,
    adminLogin,
    verifyEmail,
    forgotPassword,
    resetPassword,
    getProfile,
    updateProfile
}
