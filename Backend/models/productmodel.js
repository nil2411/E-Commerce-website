import mongoose from 'mongoose'

const productscehma = new mongoose.Schema({
    name: { type: String, required: true},
    price: { type: Number, required: true},
    description: { type: String, required: true },
    images: { type: [String], required: true },
    imagePublicIds: { type: [String], default: [] },
    category: { type: String, required: true },
    subCategory: { type: String, required: true },
    sizes: { type: Array, required: true },
    bestseller : { type: Boolean},
    sku: { type: String, unique: true, sparse: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 50 },
    active: { type: Boolean, default: true },
    date: { type: Number, required: true }
}, { timestamps: true })

productscehma.index({ name: 'text', description: 'text', category: 'text', subCategory: 'text' })

const productmodel = mongoose.models.product || mongoose.model('product',productscehma);

export default productmodel;
