import express from 'express'
import { addProduct,removeProduct,listProducts,singleProduct,updateProduct } from '../controllers/productControllerV2.js'
import upload from '../middleware/multer.js';
import adminauth from '../middleware/adminAuth.js';

const productRoutes = express.Router();

productRoutes.post('/add',adminauth,upload.fields([{name : 'image1', maxCount : 1},{name : 'image2', maxCount : 1},{name : 'image3', maxCount : 1},{name : 'image4', maxCount : 1},]),addProduct);
productRoutes.post('/update',adminauth,upload.fields([{name : 'image1', maxCount : 1},{name : 'image2', maxCount : 1},{name : 'image3', maxCount : 1},{name : 'image4', maxCount : 1},]),updateProduct);
productRoutes.delete('/remove',adminauth,removeProduct);
productRoutes.get('/list',listProducts);
productRoutes.get('/single/:id',singleProduct);
productRoutes.get('/single',singleProduct);

export default productRoutes;
