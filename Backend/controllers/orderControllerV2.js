import crypto from 'crypto'
import Stripe from 'stripe'
import Razorpay from 'razorpay'
import orderModel from '../models/orderModel.js'
import userModel from '../models/usermodel.js'
import { defaultClientOrigin, env, isAllowedClientOrigin } from '../config/env.js'
import {
    buildOrderQuote,
    reserveInventory,
    releaseInventory,
    getReceiptFields,
    fulfillPaidOrder,
    releaseOrderInventory
} from '../services/orderService.js'

let stripeClient
let razorpayClient

const getStripeClient = () => {
    const secret = process.env.STRIPE_SECRET_KEY?.trim()
    if (!secret) throw Object.assign(new Error('Stripe is not configured'), { status: 503 })
    if (!stripeClient) stripeClient = new Stripe(secret)
    return stripeClient
}

const getRazorpayClient = () => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim()
    const keySecret = process.env.RAZORPAY_SECRET_KEY?.trim()
    if (!keyId || !keySecret) throw Object.assign(new Error('Razorpay is not configured'), { status: 503 })
    if (!razorpayClient) razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret })
    return razorpayClient
}

const safeOrigin = (requestOrigin) => (
    requestOrigin && isAllowedClientOrigin(requestOrigin) ? requestOrigin : defaultClientOrigin
)

const validateAddress = (address) => {
    const required = ['firstName', 'lastName', 'email', 'street', 'city', 'state', 'zipcode', 'country', 'phone']
    if (!address || required.some((field) => !String(address[field] || '').trim())) {
        throw Object.assign(new Error('Complete delivery information is required'), { status: 400 })
    }

    return Object.fromEntries(required.map((field) => [field, String(address[field]).trim().slice(0, 200)]))
}

const createReservedOrder = async ({ userId, rawItems, address, paymentMethod, expires }) => {
    const quote = await buildOrderQuote(rawItems)
    await reserveInventory(quote.items)

    try {
        const order = await orderModel.create({
            userId,
            items: quote.items,
            subtotal: quote.subtotal,
            deliveryCharge: quote.deliveryCharge,
            amount: quote.amount,
            address: validateAddress(address),
            paymentMethod,
            payment: false,
            paymentStatus: 'pending',
            paymentCurrency: quote.currency,
            inventoryReserved: true,
            reservationExpiresAt: expires || null,
            date: new Date()
        })
        return { order, quote }
    } catch (error) {
        await releaseInventory(quote.items)
        throw error
    }
}

const quoteOrder = async (req, res, next) => {
    try {
        const quote = await buildOrderQuote(req.body.items)
        res.json({ success: true, quote })
    } catch (error) {
        next(error)
    }
}

const placeOrder = async (req, res, next) => {
    try {
        const { order } = await createReservedOrder({
            userId: req.user.id,
            rawItems: req.body.items,
            address: req.body.address,
            paymentMethod: 'COD'
        })
        await userModel.findByIdAndUpdate(req.user.id, { cartData: {} })
        res.status(201).json({ success: true, message: 'Order placed', orderId: order._id, amount: order.amount })
    } catch (error) {
        next(error)
    }
}

const placeOrderStripe = async (req, res, next) => {
    let order
    try {
        const created = await createReservedOrder({
            userId: req.user.id,
            rawItems: req.body.items,
            address: req.body.address,
            paymentMethod: 'stripe',
            expires: new Date(Date.now() + 30 * 60 * 1000)
        })
        order = created.order

        const lineItems = created.quote.items.map((item) => ({
            price_data: {
                currency: env.storeCurrency,
                product_data: { name: item.name },
                unit_amount: Math.round(item.price * 100)
            },
            quantity: item.quantity
        }))
        if (created.quote.deliveryCharge > 0) {
            lineItems.push({
                price_data: {
                    currency: env.storeCurrency,
                    product_data: { name: 'Delivery fee' },
                    unit_amount: Math.round(created.quote.deliveryCharge * 100)
                },
                quantity: 1
            })
        }

        const origin = safeOrigin(req.headers.origin)
        const session = await getStripeClient().checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            customer_email: order.address.email,
            metadata: { orderId: order._id.toString(), userId: req.user.id },
            success_url: `${origin}/orders?stripe_session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/orders?payment=cancelled`
        })

        order.stripeSessionId = session.id
        await order.save()
        res.status(201).json({ success: true, session_url: session.url, orderId: order._id, amount: order.amount })
    } catch (error) {
        if (order) {
            await releaseOrderInventory(order).catch(() => {})
            await orderModel.findByIdAndDelete(order._id).catch(() => {})
        }
        next(error)
    }
}

const placeOrderRazorpay = async (req, res, next) => {
    let order
    try {
        const created = await createReservedOrder({
            userId: req.user.id,
            rawItems: req.body.items,
            address: req.body.address,
            paymentMethod: 'razorpay',
            expires: new Date(Date.now() + 30 * 60 * 1000)
        })
        order = created.order
        const razorpayOrder = await getRazorpayClient().orders.create({
            amount: Math.round(order.amount * 100),
            currency: order.paymentCurrency,
            receipt: order._id.toString(),
            notes: { orderId: order._id.toString(), userId: req.user.id }
        })

        order.razorpayOrderId = razorpayOrder.id
        await order.save()
        res.status(201).json({
            success: true,
            order: razorpayOrder,
            key: process.env.RAZORPAY_KEY_ID?.trim(),
            orderId: order._id
        })
    } catch (error) {
        if (order) {
            await releaseOrderInventory(order).catch(() => {})
            await orderModel.findByIdAndDelete(order._id).catch(() => {})
        }
        next(error)
    }
}

const verifyRazorpay = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw Object.assign(new Error('Payment details are missing'), { status: 400 })
        }

        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY?.trim() || '')
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest()
        const received = Buffer.from(razorpay_signature, 'hex')
        if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
            throw Object.assign(new Error('Invalid payment signature'), { status: 400 })
        }

        const order = await orderModel.findOne({ razorpayOrderId: razorpay_order_id, userId: req.user.id })
        if (!order) throw Object.assign(new Error('Order not found'), { status: 404 })
        const paidOrder = await fulfillPaidOrder({
            order,
            paymentId: razorpay_payment_id,
            paymentCurrency: order.paymentCurrency
        })

        res.json({ success: true, message: 'Payment successful', receiptNumber: paidOrder.receiptNumber })
    } catch (error) {
        next(error)
    }
}

const verifyStripe = async (req, res, next) => {
    try {
        if (!req.body.sessionId) throw Object.assign(new Error('Stripe session is missing'), { status: 400 })
        const session = await getStripeClient().checkout.sessions.retrieve(req.body.sessionId)
        if (session.payment_status !== 'paid') throw Object.assign(new Error('Stripe payment is not complete'), { status: 409 })

        const order = await orderModel.findOne({
            _id: session.metadata?.orderId,
            userId: req.user.id,
            stripeSessionId: session.id
        })
        if (!order || session.metadata?.userId !== req.user.id) {
            throw Object.assign(new Error('Order not found'), { status: 404 })
        }

        const paidOrder = await fulfillPaidOrder({
            order,
            paymentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
            paymentCurrency: session.currency?.toUpperCase()
        })
        res.json({ success: true, message: 'Payment successful', receiptNumber: paidOrder.receiptNumber })
    } catch (error) {
        next(error)
    }
}

const stripeWebhook = async (req, res) => {
    try {
        const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
        if (!secret) return res.status(503).json({ success: false, message: 'Stripe webhook is not configured' })
        const event = getStripeClient().webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret)
        const session = event.data.object

        if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
            const order = await orderModel.findOne({ _id: session.metadata?.orderId, stripeSessionId: session.id })
            if (order && session.payment_status !== 'unpaid') {
                await fulfillPaidOrder({
                    order,
                    paymentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
                    paymentCurrency: session.currency?.toUpperCase()
                })
            }
        }

        if (event.type === 'checkout.session.expired') {
            const order = await orderModel.findOne({ stripeSessionId: session.id, payment: false })
            if (order) {
                await releaseOrderInventory(order)
                await orderModel.findByIdAndUpdate(order._id, {
                    status: 'Cancelled', paymentStatus: 'failed', cancellationReason: 'Payment session expired', cancelledAt: new Date()
                })
            }
        }
        res.json({ received: true })
    } catch (error) {
        res.status(400).json({ success: false, message: `Webhook error: ${error.message}` })
    }
}

const razorpayWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim()
        if (!secret) return res.status(503).json({ success: false, message: 'Razorpay webhook is not configured' })
        const received = Buffer.from(req.headers['x-razorpay-signature'] || '', 'hex')
        const expected = crypto.createHmac('sha256', secret).update(req.body).digest()
        if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
            return res.status(400).json({ success: false, message: 'Invalid webhook signature' })
        }

        const event = JSON.parse(req.body.toString('utf8'))
        const payment = event.payload?.payment?.entity
        if (['payment.captured', 'order.paid'].includes(event.event)) {
            const order = await orderModel.findOne({ razorpayOrderId: payment?.order_id })
            if (order) await fulfillPaidOrder({ order, paymentId: payment.id, paymentCurrency: payment.currency })
        }
        if (event.event === 'payment.failed') {
            const order = await orderModel.findOne({ razorpayOrderId: payment?.order_id, payment: false })
            if (order) {
                await releaseOrderInventory(order)
                await orderModel.findByIdAndUpdate(order._id, {
                    status: 'Cancelled', paymentStatus: 'failed', cancellationReason: 'Payment failed', cancelledAt: new Date()
                })
            }
        }
        res.json({ received: true })
    } catch (error) {
        res.status(400).json({ success: false, message: `Webhook error: ${error.message}` })
    }
}

const getReceipt = async (req, res, next) => {
    try {
        const order = await orderModel.findOne({ _id: req.body.orderId, userId: req.user.id })
        if (!order) throw Object.assign(new Error('Order not found'), { status: 404 })
        if (!order.payment) throw Object.assign(new Error('Receipt is available after payment'), { status: 409 })

        if (!order.receiptNumber) {
            Object.assign(order, getReceiptFields(order, order.paymentId))
            await order.save()
        }

        res.json({
            success: true,
            receipt: {
                receiptNumber: order.receiptNumber,
                orderId: order._id,
                paymentId: order.paymentId,
                paymentMethod: order.paymentMethod,
                currency: order.paymentCurrency,
                subtotal: order.subtotal,
                deliveryCharge: order.deliveryCharge,
                amount: order.amount,
                paidAt: order.paidAt || order.date,
                customer: order.address,
                items: order.items,
                refundStatus: order.refundStatus
            }
        })
    } catch (error) {
        next(error)
    }
}

const userOrders = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.body.page) || 1)
        const limit = Math.min(100, Math.max(1, Number(req.body.limit) || 50))
        const filter = { userId: req.user.id }
        const [orders, total] = await Promise.all([
            orderModel.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit),
            orderModel.countDocuments(filter)
        ])
        res.json({ success: true, orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
    } catch (error) {
        next(error)
    }
}

const allOrders = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.body.page) || 1)
        const limit = Math.min(100, Math.max(1, Number(req.body.limit) || 50))
        const filter = {}
        if (req.body.status) filter.status = req.body.status
        if (req.body.paymentStatus) filter.paymentStatus = req.body.paymentStatus
        if (req.body.query) {
            const query = String(req.body.query).trim()
            filter.$or = [
                { 'address.email': { $regex: query, $options: 'i' } },
                { 'address.firstName': { $regex: query, $options: 'i' } }
            ]
        }
        const [orders, total] = await Promise.all([
            orderModel.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit),
            orderModel.countDocuments(filter)
        ])
        res.json({ success: true, orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
    } catch (error) {
        next(error)
    }
}

const updateStatus = async (req, res, next) => {
    try {
        const allowed = ['Order Placed', 'Packing', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled']
        if (!allowed.includes(req.body.status)) throw Object.assign(new Error('Invalid order status'), { status: 400 })
        const order = await orderModel.findById(req.body.orderId)
        if (!order) throw Object.assign(new Error('Order not found'), { status: 404 })

        if (req.body.status === 'Cancelled') {
            await releaseOrderInventory(order)
            order.cancelledAt = new Date()
            order.cancellationReason = req.body.reason || 'Cancelled by administrator'
        }
        order.status = req.body.status
        if (req.body.status === 'Delivered' && order.paymentMethod === 'COD' && !order.payment) {
            const paidOrder = await fulfillPaidOrder({
                order,
                paymentId: `COD-${order._id}`,
                paymentCurrency: order.paymentCurrency
            })
            paidOrder.status = 'Delivered'
            await paidOrder.save()
            return res.json({ success: true, message: 'Order delivered and receipt generated', payment: true, receiptNumber: paidOrder.receiptNumber })
        }

        await order.save()
        res.json({ success: true, message: 'Order status updated', payment: order.payment, receiptNumber: order.receiptNumber })
    } catch (error) {
        next(error)
    }
}

const performRefund = async (order) => {
    if (order.refundStatus === 'succeeded') return order
    order.refundStatus = 'pending'
    await order.save()

    let refundId = `COD-REFUND-${order._id}`
    if (order.paymentMethod === 'stripe') {
        const refund = await getStripeClient().refunds.create({ payment_intent: order.paymentId })
        refundId = refund.id
    } else if (order.paymentMethod === 'razorpay') {
        const refund = await getRazorpayClient().payments.refund(order.paymentId, {
            amount: Math.round(order.amount * 100),
            notes: { orderId: order._id.toString() }
        })
        refundId = refund.id
    }

    await releaseOrderInventory(order)
    order.refundId = refundId
    order.refundStatus = 'succeeded'
    order.paymentStatus = 'refunded'
    order.refundedAt = new Date()
    order.status = 'Cancelled'
    order.cancelledAt = new Date()
    await order.save()
    return order
}

const refundOrder = async (req, res, next) => {
    try {
        const order = await orderModel.findById(req.body.orderId)
        if (!order) throw Object.assign(new Error('Order not found'), { status: 404 })
        if (!order.payment) throw Object.assign(new Error('Only paid orders can be refunded'), { status: 409 })
        const refunded = await performRefund(order)
        res.json({ success: true, message: 'Refund completed', refundId: refunded.refundId })
    } catch (error) {
        next(error)
    }
}

const cancelOrder = async (req, res, next) => {
    try {
        const order = await orderModel.findOne({ _id: req.body.orderId, userId: req.user.id })
        if (!order) throw Object.assign(new Error('Order not found'), { status: 404 })
        if (!['Order Placed', 'Packing'].includes(order.status)) {
            throw Object.assign(new Error('This order can no longer be cancelled online'), { status: 409 })
        }

        if (order.payment) {
            await performRefund(order)
        } else {
            await releaseOrderInventory(order)
            order.status = 'Cancelled'
            order.cancelledAt = new Date()
            order.cancellationReason = String(req.body.reason || 'Cancelled by customer').slice(0, 300)
            await order.save()
        }
        res.json({ success: true, message: order.payment ? 'Order cancelled and refunded' : 'Order cancelled' })
    } catch (error) {
        next(error)
    }
}

const dashboard = async (req, res, next) => {
    try {
        const [orderCount, customerCount, revenueRows, statusRows, recentOrders] = await Promise.all([
            orderModel.countDocuments(),
            userModel.countDocuments(),
            orderModel.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: null, revenue: { $sum: '$amount' }, paidOrders: { $sum: 1 } } }
            ]),
            orderModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            orderModel.find().sort({ date: -1 }).limit(5).select('amount status paymentStatus date address')
        ])
        res.json({
            success: true,
            dashboard: {
                orderCount,
                customerCount,
                revenue: revenueRows[0]?.revenue || 0,
                paidOrders: revenueRows[0]?.paidOrders || 0,
                byStatus: statusRows,
                recentOrders
            }
        })
    } catch (error) {
        next(error)
    }
}

export {
    quoteOrder,
    placeOrder,
    placeOrderStripe,
    placeOrderRazorpay,
    verifyRazorpay,
    verifyStripe,
    stripeWebhook,
    razorpayWebhook,
    getReceipt,
    userOrders,
    allOrders,
    updateStatus,
    refundOrder,
    cancelOrder,
    dashboard
}
