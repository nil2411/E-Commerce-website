import crypto from "crypto"
import orderModel from "../models/orderModel.js"
import userModel from "../models/usermodel.js"
import Stripe from "stripe"
import Razorpay from "razorpay"

const currency = "usd"
const deliveryCharge = 10

let stripeClient

const getStripeClient = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("Stripe secret key is not configured")
    }

    if (!stripeClient) {
        stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY)
    }

    return stripeClient
}

const getRazorpayClient = () => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim()
    const keySecret = process.env.RAZORPAY_SECRET_KEY?.trim()

    if (!keyId || !keySecret) {
        throw new Error("Razorpay credentials are not configured")
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret
    })
}

const getRazorpayErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message
    }
    return error?.error?.description || error?.description || error?.message || "Razorpay request failed"
}

const getReceiptFields = (order, paymentId) => {
    const paidAt = new Date()
    const datePart = paidAt.toISOString().slice(0, 10).replaceAll("-", "")
    const orderPart = order._id.toString().slice(-8).toUpperCase()

    return {
        payment: true,
        paymentId,
        paidAt,
        receiptNumber: order.receiptNumber || `RCP-${datePart}-${orderPart}`
    }
}

const placeOrder = async (req, res) => {
    try {
        const { userId, items, amount, address} = req.body
        const orderData = {
            userId,
            items,
            amount,
            address,
            paymentMethod: "COD",
            payment: false,
            paymentCurrency: "USD",
            date: Date.now()
        }
        const newOrder = new orderModel(orderData)
        await newOrder.save()

        await userModel.findByIdAndUpdate(userId, {cartData: {}})

        res.json({success: true, message: "Order Placed"})
    }
    catch (error){
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

// Placing orders using stripe method
const placeOrderStripe = async (req, res) => {
    let newOrder
    try{
        const {userId, items, amount, address} = req.body
        const {origin} = req.headers;

        const orderData = {
            userId,
            items,
            amount,
            address,
            paymentMethod: "stripe",
            payment: false,
            paymentCurrency: "USD",
            date: Date.now()
        }
        newOrder = new orderModel(orderData)
        await newOrder.save()

        const line_items = items.map((item) =>({
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }));
        line_items.push({
            price_data: {
                currency,
                product_data: {
                    name: "Delivery Fee"
                },
                unit_amount: deliveryCharge * 100
            },
            quantity: 1
        })

        const stripe = getStripeClient()
        const session = await stripe.checkout.sessions.create({
            
            payment_method_types: ['card'],
            line_items: line_items,
            mode: 'payment',
            metadata: {
                orderId: newOrder._id.toString(),
                userId: userId.toString()
            },
            success_url: `${origin}/orders?stripe_session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/orders`,
        })

        await orderModel.findByIdAndUpdate(newOrder._id, {
            stripeSessionId: session.id
        })

        res.json({success: true, session_url: session.url})


    }
    catch (error){
        console.log(error)
        if (newOrder?._id) {
            await orderModel.findByIdAndDelete(newOrder._id).catch(() => {})
        }
        res.json({success: false, message: error.message})
    }

}

// Placing orders using Razorpay method
const placeOrderRazorpay = async (req, res) => {
    let newOrder
    try {
        const { userId, items, amount, address } = req.body

        const orderData = {
            userId,
            items,
            amount,
            address,
            paymentMethod: "razorpay",
            payment: false,
            paymentCurrency: "INR",
            date: Date.now()
        }
        newOrder = new orderModel(orderData)
        await newOrder.save()

        const razorpay = getRazorpayClient()
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: newOrder._id.toString()
        })

        await orderModel.findByIdAndUpdate(newOrder._id, {
            razorpayOrderId: razorpayOrder.id
        })

        res.json({
            success: true,
            order: razorpayOrder,
            key: process.env.RAZORPAY_KEY_ID?.trim()
        })
    }
    catch (error) {
        console.log(error)
        if (newOrder?._id) {
            await orderModel.findByIdAndDelete(newOrder._id).catch(() => {})
        }
        res.json({ success: false, message: getRazorpayErrorMessage(error) })
    }
}

const verifyRazorpay = async (req, res) => {
    try {
        const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.json({ success: false, message: "Payment details are missing" })
        }

        const body = `${razorpay_order_id}|${razorpay_payment_id}`
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY?.trim())
            .update(body)
            .digest("hex")

        if (expectedSignature !== razorpay_signature) {
            return res.json({ success: false, message: "Invalid payment signature" })
        }

        const order = await orderModel.findOne({
            razorpayOrderId: razorpay_order_id,
            userId
        })

        if (!order) {
            return res.json({ success: false, message: "Order not found" })
        }

        if (order.payment) {
            return res.json({
                success: true,
                message: "Payment already verified",
                receiptNumber: order.receiptNumber
            })
        }

        const receiptFields = getReceiptFields(order, razorpay_payment_id)
        await orderModel.findByIdAndUpdate(order._id, receiptFields)
        await userModel.findByIdAndUpdate(userId, { cartData: {} })

        res.json({
            success: true,
            message: "Payment Successful",
            receiptNumber: receiptFields.receiptNumber
        })
    }
    catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const verifyStripe = async (req, res) => {
    try {
        const { userId, sessionId } = req.body

        if (!sessionId) {
            return res.json({ success: false, message: "Stripe session is missing" })
        }

        const stripe = getStripeClient()
        const session = await stripe.checkout.sessions.retrieve(sessionId)

        if (session.payment_status !== "paid") {
            return res.json({ success: false, message: "Stripe payment is not complete" })
        }

        const order = await orderModel.findOne({
            _id: session.metadata?.orderId,
            userId,
            stripeSessionId: session.id
        })

        if (!order || session.metadata?.userId !== userId.toString()) {
            return res.json({ success: false, message: "Order not found" })
        }

        if (order.payment) {
            return res.json({
                success: true,
                message: "Payment already verified",
                receiptNumber: order.receiptNumber
            })
        }

        const paymentId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.id
        const receiptFields = getReceiptFields(order, paymentId)

        await orderModel.findByIdAndUpdate(order._id, receiptFields)
        await userModel.findByIdAndUpdate(userId, { cartData: {} })

        res.json({
            success: true,
            message: "Payment Successful",
            receiptNumber: receiptFields.receiptNumber
        })
    }
    catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const getReceipt = async (req, res) => {
    try {
        const { userId, orderId } = req.body
        const order = await orderModel.findOne({ _id: orderId, userId })

        if (!order) {
            return res.json({ success: false, message: "Order not found" })
        }

        if (!order.payment) {
            return res.json({ success: false, message: "Receipt is available after payment" })
        }

        let receiptNumber = order.receiptNumber
        let paidAt = order.paidAt

        // Backfill receipts for paid orders created before receipt support was added.
        if (!receiptNumber) {
            const receiptFields = getReceiptFields(order, order.paymentId)
            receiptNumber = receiptFields.receiptNumber
            paidAt = receiptFields.paidAt
            await orderModel.findByIdAndUpdate(order._id, receiptFields)
        }

        res.json({
            success: true,
            receipt: {
                receiptNumber,
                orderId: order._id,
                paymentId: order.paymentId,
                paymentMethod: order.paymentMethod,
                currency: order.paymentCurrency || "USD",
                amount: order.amount,
                paidAt: paidAt || order.date,
                customer: order.address,
                items: order.items
            }
        })
    }
    catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// All orders data for admin panel
const allOrders = async (req, res) => {
    try{
        const orders = await orderModel.find({})
        res.json({success: true, orders})
    }
    catch(error){
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

// User order data for frontend
const userOrders = async (req, res) => {
    try{
        const {userId} = req.body
        const orders = await orderModel.find({userId})
        res.json({success: true, orders})
    }
    catch (error){
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

// Update order status
const updateStatus = async (req, res) => {
    try{
        const {orderId, status} = req.body
        const order = await orderModel.findById(orderId)

        if (!order) {
            return res.json({success: false, message: "Order not found"})
        }

        const update = { status }
        if (status === "Delivered" && order.paymentMethod === "COD" && !order.payment) {
            Object.assign(update, getReceiptFields(order, `COD-${order._id}`))
        }

        const updatedOrder = await orderModel.findByIdAndUpdate(orderId, update, { new: true })
        res.json({
            success: true,
            message: "Order Status Updated",
            payment: updatedOrder.payment,
            receiptNumber: updatedOrder.receiptNumber
        })
    }
    catch (error){
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

export { placeOrder, placeOrderRazorpay, placeOrderStripe, verifyRazorpay, verifyStripe, getReceipt, allOrders, updateStatus, userOrders }
