import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: { type: Array, required: true },
    amount: { type: Number, required: true },
    subtotal: { type: Number },
    deliveryCharge: { type: Number, default: 0 },
    address: { type: Object, required: true},
    status: { type: String, required: true, default: 'Order Placed' },
    paymentMethod: { type: String, required: true },
    payment: { type: Boolean, required: true, default: false},
    razorpayOrderId: { type: String },
    stripeSessionId: { type: String },
    paymentId: { type: String },
    paymentCurrency: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    receiptNumber: { type: String, unique: true, sparse: true },
    paidAt: { type: Date },
    inventoryReserved: { type: Boolean, default: false },
    reservationExpiresAt: { type: Date },
    cancellationReason: { type: String },
    cancelledAt: { type: Date },
    refundId: { type: String },
    refundStatus: { type: String, enum: ['none', 'pending', 'succeeded', 'failed'], default: 'none' },
    refundedAt: { type: Date },
    date: { type: Date, required: true }
}, { timestamps: true })

orderSchema.index({ userId: 1, date: -1 })
orderSchema.index({ status: 1, date: -1 })
orderSchema.index({ stripeSessionId: 1 }, { sparse: true })
orderSchema.index({ razorpayOrderId: 1 }, { sparse: true })

const orderModel = mongoose.models.order || mongoose.model('order', orderSchema)
export default orderModel;
