import userModel from "../models/usermodel.js";
import productModel from "../models/productmodel.js";

const toId = (id) => String(id);

/** Strip zero/invalid qty and normalize product id keys */
const cloneCart = (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const cart = JSON.parse(JSON.stringify(raw));
    const normalized = {};
    for (const [key, sizes] of Object.entries(cart)) {
        if (!sizes || typeof sizes !== "object") continue;
        const cleaned = {};
        for (const [size, qty] of Object.entries(sizes)) {
            const n = Number(qty);
            if (n > 0) cleaned[size] = n;
        }
        if (Object.keys(cleaned).length > 0) {
            normalized[toId(key)] = cleaned;
        }
    }
    return normalized;
};

const saveCart = async (userData, cartData) => {
    const cleaned = cloneCart(cartData);
    userData.cartData = cleaned;
    userData.markModified("cartData");
    await userData.save();
    return cleaned;
};

const addTocart = async (req, res) => {
    try {
        const { userId, itemId, size } = req.body;
        const productId = toId(itemId);
        const product = await productModel.findById(productId).lean();
        if (!product || product.active === false) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        if (!Array.isArray(product.sizes) || !product.sizes.includes(size)) {
            return res.status(400).json({ success: false, message: "Selected size is unavailable" });
        }
        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }

        const cartData = cloneCart(userData.cartData);
        if (cartData[productId]) {
            if (cartData[productId][size]) {
                cartData[productId][size] += 1;
            } else {
                cartData[productId][size] = 1;
            }
        } else {
            cartData[productId] = {};
            cartData[productId][size] = 1;
        }

        if (cartData[productId][size] > Math.min(product.stock, 20)) {
            return res.status(409).json({ success: false, message: "Requested quantity is unavailable" });
        }
        const saved = await saveCart(userData, cartData);
        res.json({ success: true, cartData: saved, message: "Product added to cart successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const updateCart = async (req, res) => {
    try {
        const { userId, itemId, size, quantity } = req.body;
        const productId = toId(itemId);
        const qty = Number(quantity);
        const product = await productModel.findById(productId).lean();
        if (!product || product.active === false) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        if (!Array.isArray(product.sizes) || !product.sizes.includes(size)) {
            return res.status(400).json({ success: false, message: "Selected size is unavailable" });
        }
        if (!Number.isInteger(qty) || qty > Math.min(product.stock, 20)) {
            return res.status(400).json({ success: false, message: "Requested quantity is unavailable" });
        }
        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }

        const cartData = cloneCart(userData.cartData);
        if (!cartData[productId]) {
            cartData[productId] = {};
        }

        if (!qty || qty <= 0) {
            delete cartData[productId][size];
            if (Object.keys(cartData[productId]).length === 0) {
                delete cartData[productId];
            }
        } else {
            cartData[productId][size] = qty;
        }

        const saved = await saveCart(userData, cartData);
        res.json({ success: true, cartData: saved, message: "Cart updated successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const getUserCart = async (req, res) => {
    try {
        const { userId } = req.body;
        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }

        const cartData = cloneCart(userData.cartData);
        const dirty = JSON.stringify(userData.cartData || {}) !== JSON.stringify(cartData);
        if (dirty) {
            await saveCart(userData, cartData);
        }

        res.json({ success: true, cartData, message: cartData });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export { addTocart, updateCart, getUserCart };
