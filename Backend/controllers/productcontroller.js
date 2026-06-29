import { v2 as cloudinary } from 'cloudinary';
import productmodel from '../models/productmodel.js';

const ALLOWED_CATEGORIES = ['Men', 'Women', 'Kids'];
const ALLOWED_SUBCATEGORIES = ['Topwear', 'Bottomwear', 'Winterwear'];

/** Multipart fields can repeat or arrive under alternate keys; never return empty string as "missing". */
const pickBodyStr = (body, keys) => {
    for (const key of keys) {
        if (body[key] === undefined || body[key] === null) continue;
        let v = body[key];
        if (Array.isArray(v)) v = v[0];
        if (v === undefined || v === null) continue;
        const s = String(v).trim();
        if (s !== '') return s;
    }
    return undefined;
};

const normalizeCategory = (raw, fallback) => {
    const s = raw === undefined || raw === null ? '' : String(raw).trim();
    if (!s) return fallback;
    const hit = ALLOWED_CATEGORIES.find((c) => c.toLowerCase() === s.toLowerCase());
    return hit || fallback;
};

const normalizeSubCategory = (raw, fallback) => {
    const s = raw === undefined || raw === null ? '' : String(raw).trim();
    if (!s) return fallback;
    const hit = ALLOWED_SUBCATEGORIES.find((c) => c.toLowerCase() === s.toLowerCase());
    return hit || fallback;
};

//add product


const addproduct = async (req, res) => {
    try {
        const { name, description, price, category, subCategory, sizes, bestseller } = req.body;

        const image1 = req.files?.image1?.[0];
        const image2 = req.files?.image2?.[0];
        const image3 = req.files?.image3?.[0];
        const image4 = req.files?.image4?.[0];

        // console.log(name, description, price, category, subcategory, sizes, bestseller);

        const images = [image1, image2, image3, image4].filter((item) => item !== undefined);

        if (images.length === 0) {
            return res.json({ success: false, message: 'Missing required files (image1..image4)' });
        }

        const imageurls = await Promise.all(
            images.map(async (item) => {
                if (!item?.path) {
                    throw new Error('Uploaded file is missing local path');
                }
                const result = await cloudinary.uploader.upload(item.path, { resource_type: 'image' });
                return result.secure_url;
            })
        );

        console.log(imageurls);

        const productdata = {
            name,
            price: Number(price),
            description,
            images: imageurls,
            category,
            subCategory,
            sizes: JSON.parse(sizes),
            bestseller: bestseller === "true" ? true : false,
            date: Date.now()

        }

        console.log(productdata);

        const product = new productmodel(productdata);
        await product.save();


        return res.json({ success: true, imageurls, message: "product added" });
    } catch (error) {
        console.log(error);


        res.json({ success: false, message: error.message });

    }




}

//remove product
const removeproduct = async (req, res) => {

    try {
        const deletedproduct = await productmodel.findByIdAndDelete(req.body.id);
        res.json({success : true, deletedproduct,message : "product deleted"});
        
    } catch (error) {
        console.log(error);


        res.json({ success: false, message: error.message });
        
    }

}

//list products
const listproduct = async (req, res) => {
    try {
        const products = await productmodel.find({});
        res.json({ success: true, products, message: "product list displayed " })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });

    }



}

//single product info
const singleproduct = async (req, res) => {

    try {
        const singleproduct = await productmodel.findById(req.body.id);
        res.json({success : true, singleproduct,message : "single product displayed successfully"});
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
        
    }

}

// update product (keeps existing images if new images are not uploaded)
const updateproduct = async (req, res) => {
    try {
        const idRaw = pickBodyStr(req.body, ['id', '_id']);
        if (!idRaw) {
            return res.json({ success: false, message: 'Product id is required' });
        }

        const product = await productmodel.findById(idRaw);
        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }

        const nameIn = pickBodyStr(req.body, ['name']);
        const descriptionIn = pickBodyStr(req.body, ['description']);
        const priceIn = pickBodyStr(req.body, ['price']);
        const categoryIn = pickBodyStr(req.body, ['category', 'Category']);
        const subCategoryIn = pickBodyStr(req.body, ['subCategory', 'subcategory', 'SubCategory']);
        const sizesIn = req.body.sizes ?? req.body.size;
        const bestsellerRaw = pickBodyStr(req.body, ['bestseller', 'bestSeller']);

        const image1 = req.files?.image1?.[0];
        const image2 = req.files?.image2?.[0];
        const image3 = req.files?.image3?.[0];
        const image4 = req.files?.image4?.[0];

        // Start with existing images; replace only those that were uploaded.
        const images = Array.isArray(product.images) ? [...product.images] : [];

        const uploadImage = async (file) => {
            if (!file?.path) return null;
            const result = await cloudinary.uploader.upload(file.path, { resource_type: 'image' });
            return result.secure_url;
        };

        const [u1, u2, u3, u4] = await Promise.all([uploadImage(image1), uploadImage(image2), uploadImage(image3), uploadImage(image4)]);

        if (u1) images[0] = u1;
        if (u2) images[1] = u2;
        if (u3) images[2] = u3;
        if (u4) images[3] = u4;

        if (!images || images.length === 0) {
            return res.json({ success: false, message: 'Missing required images' });
        }

        if (nameIn !== undefined) product.name = nameIn;
        if (descriptionIn !== undefined) product.description = descriptionIn;
        if (priceIn !== undefined) product.price = Number(priceIn);

        product.category = normalizeCategory(categoryIn, product.category);
        product.subCategory = normalizeSubCategory(subCategoryIn, product.subCategory);

        if (sizesIn !== undefined && sizesIn !== null && sizesIn !== '') {
            let parsedSizes;
            if (typeof sizesIn === 'string') {
                parsedSizes = JSON.parse(sizesIn);
            } else if (Array.isArray(sizesIn)) {
                parsedSizes = sizesIn;
            } else {
                parsedSizes = product.sizes;
            }
            product.sizes = parsedSizes;
        }

        if (bestsellerRaw !== undefined) {
            product.bestseller = bestsellerRaw === 'true' || bestsellerRaw === '1';
        }

        product.images = images.filter(Boolean);

        await product.save();

        return res.json({ success: true, message: 'product updated', product });
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
};

export { addproduct, removeproduct, listproduct, singleproduct, updateproduct };