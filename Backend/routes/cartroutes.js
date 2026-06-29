import express from 'express'

import {addTocart,getUserCart,updateCart} from '../controllers/cartcontoller.js';
import authuser from '../middleware/auth.js';

const cartRouter = express.Router();

cartRouter.post('/get',authuser,getUserCart);
cartRouter.post('/add',authuser,addTocart);
cartRouter.post('/update',authuser,updateCart);

export default cartRouter;