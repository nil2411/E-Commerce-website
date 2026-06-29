import fs from 'fs/promises'
import mongoose from 'mongoose'
import { v2 as cloudinary } from 'cloudinary'
import productModel from '../models/productmodel.js'

const ALLOWED_CATEGORIES = ['Men', 'Women', 'Kids']
const ALLOWED_SUBCATEGORIES = ['Topwear', 'Bottomwear', 'Winterwear']

const filesFromRequest = (req) => ['image1', 'image2', 'image3', 'image4']
    .map((name) => req.files?.[name]?.[0])
    .filter(Boolean)

const cleanupFiles = async (files) => {
    await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})))
}

const uploadFiles = async (files) => {
    try {
        return await Promise.all(files.map((file) => cloudinary.uploader.upload(file.path, {
            resource_type: 'image',
            folder: 'forever-store/products',
            transformation: [{ width: 1200, height: 1500, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
        })))
    } finally {
        await cleanupFiles(files)
    }
}

const parseSizes = (value, fallback = []) => {
    const sizes = typeof value === 'string' ? JSON.parse(value) : value
    if (!Array.isArray(sizes) || sizes.length === 0) return fallback
    return [...new Set(sizes.map((size) => String(size).trim()).filter(Boolean))].slice(0, 20)
}

const normalizeProductInput = (body, existing = {}) => {
    const name = String(body.name ?? existing.name ?? '').trim()
    const description = String(body.description ?? existing.description ?? '').trim()
    const price = Number(body.price ?? existing.price)
    const stock = Number(body.stock ?? existing.stock ?? 0)
    const category = String(body.category ?? existing.category ?? '')
    const subCategory = String(body.subCategory ?? body.subcategory ?? existing.subCategory ?? '')

    if (name.length < 2 || name.length > 160) throw Object.assign(new Error('Product name must contain 2 to 160 characters'), { status: 400 })
    if (description.length < 10 || description.length > 3000) throw Object.assign(new Error('Product description must contain 10 to 3000 characters'), { status: 400 })
    if (!Number.isFinite(price) || price <= 0) throw Object.assign(new Error('Price must be greater than zero'), { status: 400 })
    if (!Number.isInteger(stock) || stock < 0) throw Object.assign(new Error('Stock must be a non-negative whole number'), { status: 400 })
    if (!ALLOWED_CATEGORIES.includes(category)) throw Object.assign(new Error('Invalid category'), { status: 400 })
    if (!ALLOWED_SUBCATEGORIES.includes(subCategory)) throw Object.assign(new Error('Invalid subcategory'), { status: 400 })

    return {
        name,
        description,
        price,
        stock,
        category,
        subCategory,
        sizes: parseSizes(body.sizes, existing.sizes),
        sku: String(body.sku ?? existing.sku ?? '').trim() || undefined,
        bestseller: ['true', '1', true].includes(body.bestseller),
        active: body.active === undefined ? existing.active !== false : ['true', '1', true].includes(body.active)
    }
}

const addProduct = async (req, res, next) => {
    const files = filesFromRequest(req)
    try {
        if (files.length === 0) throw Object.assign(new Error('At least one product image is required'), { status: 400 })
        const input = normalizeProductInput(req.body)
        const uploaded = await uploadFiles(files)
        const product = await productModel.create({
            ...input,
            images: uploaded.map((image) => image.secure_url),
            imagePublicIds: uploaded.map((image) => image.public_id),
            date: Date.now()
        })
        res.status(201).json({ success: true, product, message: 'Product added' })
    } catch (error) {
        await cleanupFiles(files)
        if (error?.code === 11000) error = Object.assign(new Error('SKU must be unique'), { status: 409 })
        next(error)
    }
}

const updateProduct = async (req, res, next) => {
    const files = filesFromRequest(req)
    try {
        const id = String(req.body.id || req.body._id || '')
        if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error('Valid product id is required'), { status: 400 })
        const product = await productModel.findById(id)
        if (!product) throw Object.assign(new Error('Product not found'), { status: 404 })

        Object.assign(product, normalizeProductInput(req.body, product.toObject()))
        if (files.length > 0) {
            const uploaded = await uploadFiles(files)
            const oldPublicIds = [...(product.imagePublicIds || [])]
            product.images = uploaded.map((image) => image.secure_url)
            product.imagePublicIds = uploaded.map((image) => image.public_id)
            await Promise.all(oldPublicIds.map((id) => cloudinary.uploader.destroy(id).catch(() => {})))
        }
        await product.save()
        res.json({ success: true, product, message: 'Product updated' })
    } catch (error) {
        await cleanupFiles(files)
        if (error?.code === 11000) error = Object.assign(new Error('SKU must be unique'), { status: 409 })
        next(error)
    }
}

const removeProduct = async (req, res, next) => {
    try {
        const id = String(req.body.id || req.query.id || '')
        if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error('Valid product id is required'), { status: 400 })
        const product = await productModel.findByIdAndDelete(id)
        if (!product) throw Object.assign(new Error('Product not found'), { status: 404 })
        await Promise.all((product.imagePublicIds || []).map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => {})))
        res.json({ success: true, message: 'Product removed' })
    } catch (error) {
        next(error)
    }
}

const listProducts = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1)
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 100))
        const filter = {}
        if (req.query.category) filter.category = req.query.category
        if (req.query.subCategory) filter.subCategory = req.query.subCategory
        if (req.query.active !== 'all') filter.active = { $ne: false }
        if (req.query.q) {
            const escaped = String(req.query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            filter.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { description: { $regex: escaped, $options: 'i' } },
                { sku: { $regex: escaped, $options: 'i' } }
            ]
        }
        const sort = req.query.sort === 'price_asc' ? { price: 1 }
            : req.query.sort === 'price_desc' ? { price: -1 }
                : { date: -1 }
        const [products, total] = await Promise.all([
            productModel.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
            productModel.countDocuments(filter)
        ])
        res.json({ success: true, products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
    } catch (error) {
        next(error)
    }
}

const singleProduct = async (req, res, next) => {
    try {
        const id = String(req.params.id || req.query.id || req.body?.id || '')
        if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error('Valid product id is required'), { status: 400 })
        const product = await productModel.findById(id)
        if (!product) throw Object.assign(new Error('Product not found'), { status: 404 })
        res.json({ success: true, product, singleproduct: product })
    } catch (error) {
        next(error)
    }
}

export { addProduct, updateProduct, removeProduct, listProducts, singleProduct }
