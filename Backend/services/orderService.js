import mongoose from 'mongoose'
import orderModel from '../models/orderModel.js'
import productModel from '../models/productmodel.js'
import userModel from '../models/usermodel.js'
import { env } from '../config/env.js'
import { sendOrderEmail } from './emailService.js'

const MAX_ITEM_QUANTITY = 20

const normalizeRequestedItems = (rawItems) => {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        const error = new Error('Your cart is empty')
        error.status = 400
        throw error
    }

    const grouped = new Map()
    for (const item of rawItems) {
        const productId = String(item?._id || item?.productId || '')
        const size = String(item?.size || '').trim()
        const quantity = Number(item?.quantity)

        if (!mongoose.isValidObjectId(productId) || !size || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
            const error = new Error('Cart contains an invalid product, size, or quantity')
            error.status = 400
            throw error
        }

        const key = `${productId}:${size}`
        grouped.set(key, {
            productId,
            size,
            quantity: (grouped.get(key)?.quantity || 0) + quantity
        })
    }

    return [...grouped.values()]
}

const buildOrderQuote = async (rawItems) => {
    const requested = normalizeRequestedItems(rawItems)
    const productIds = [...new Set(requested.map((item) => item.productId))]
    const products = await productModel.find({ _id: { $in: productIds }, active: { $ne: false } }).lean()
    const byId = new Map(products.map((product) => [product._id.toString(), product]))

    const items = requested.map((requestedItem) => {
        const product = byId.get(requestedItem.productId)
        if (!product) {
            const error = new Error('A product in your cart is no longer available')
            error.status = 409
            throw error
        }
        if (!Array.isArray(product.sizes) || !product.sizes.includes(requestedItem.size)) {
            const error = new Error(`${product.name} is not available in size ${requestedItem.size}`)
            error.status = 409
            throw error
        }
        if (Number(product.stock || 0) < requestedItem.quantity) {
            const error = new Error(`Only ${product.stock || 0} unit(s) of ${product.name} remain`) 
            error.status = 409
            throw error
        }

        return {
            productId: product._id.toString(),
            name: product.name,
            price: Number(product.price),
            images: product.images,
            size: requestedItem.size,
            quantity: requestedItem.quantity,
            sku: product.sku || ''
        }
    })

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const deliveryCharge = subtotal > 0 ? env.deliveryCharge : 0

    return {
        items,
        subtotal,
        deliveryCharge,
        amount: subtotal + deliveryCharge,
        currency: env.storeCurrency.toUpperCase()
    }
}

const reserveInventory = async (items) => {
    const reserved = []
    try {
        for (const item of items) {
            const product = await productModel.findOneAndUpdate(
                { _id: item.productId, active: { $ne: false }, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { new: true }
            )
            if (!product) {
                const error = new Error(`${item.name} sold out while your order was being created`)
                error.status = 409
                throw error
            }
            reserved.push(item)
        }
    } catch (error) {
        await releaseInventory(reserved)
        throw error
    }
}

const releaseInventory = async (items) => {
    await Promise.all((items || []).map((item) => (
        productModel.findByIdAndUpdate(item.productId, { $inc: { stock: Number(item.quantity) || 0 } })
    )))
}

const getReceiptFields = (order, paymentId) => {
    const paidAt = new Date()
    const datePart = paidAt.toISOString().slice(0, 10).replaceAll('-', '')
    const orderPart = order._id.toString().slice(-8).toUpperCase()

    return {
        payment: true,
        paymentStatus: 'paid',
        paymentId,
        paidAt,
        reservationExpiresAt: null,
        receiptNumber: order.receiptNumber || `RCP-${datePart}-${orderPart}`
    }
}

const fulfillPaidOrder = async ({ order, paymentId, paymentCurrency }) => {
    if (order.payment) return order

    const receiptFields = getReceiptFields(order, paymentId)
    const updatedOrder = await orderModel.findOneAndUpdate(
        { _id: order._id, payment: false },
        { $set: { ...receiptFields, paymentCurrency: paymentCurrency || order.paymentCurrency } },
        { new: true }
    )

    if (!updatedOrder) return orderModel.findById(order._id)

    await userModel.findByIdAndUpdate(order.userId, { cartData: {} })
    sendOrderEmail({ order: updatedOrder, receiptNumber: updatedOrder.receiptNumber }).catch((error) => {
        console.error(JSON.stringify({ level: 'error', message: error.message, orderId: updatedOrder._id }))
    })
    return updatedOrder
}

const releaseOrderInventory = async (order) => {
    const released = await orderModel.findOneAndUpdate(
        { _id: order._id, inventoryReserved: true },
        { $set: { inventoryReserved: false, reservationExpiresAt: null } },
        { new: true }
    )
    if (released) await releaseInventory(released.items)
    return released || order
}

const releaseExpiredReservations = async () => {
    const expiredOrders = await orderModel.find({
        payment: false,
        inventoryReserved: true,
        reservationExpiresAt: { $lte: new Date() }
    })

    for (const order of expiredOrders) {
        await releaseOrderInventory(order)
        await orderModel.findByIdAndUpdate(order._id, {
            status: 'Cancelled',
            paymentStatus: 'failed',
            cancellationReason: 'Payment session expired',
            cancelledAt: new Date()
        })
    }
    return expiredOrders.length
}

export {
    MAX_ITEM_QUANTITY,
    normalizeRequestedItems,
    buildOrderQuote,
    reserveInventory,
    releaseInventory,
    getReceiptFields,
    fulfillPaidOrder,
    releaseOrderInventory,
    releaseExpiredReservations
}
