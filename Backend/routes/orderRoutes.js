import express from 'express'
import {
    quoteOrder,placeOrder,placeOrderStripe,placeOrderRazorpay,verifyRazorpay,verifyStripe,
    getReceipt,allOrders,userOrders,updateStatus,refundOrder,cancelOrder,dashboard
} from '../controllers/orderControllerV2.js';
import adminauth from '../middleware/adminAuth.js';   
import authUser from '../middleware/auth.js';


const orderRouter = express.Router()
//admin features
orderRouter.post('/list',adminauth,allOrders);
orderRouter.post('/status',adminauth,updateStatus);
orderRouter.post('/refund',adminauth,refundOrder);
orderRouter.get('/dashboard',adminauth,dashboard);

//Payment features
orderRouter.post('/place',authUser,placeOrder);
orderRouter.post('/quote',authUser,quoteOrder);
orderRouter.post('/stripe',authUser,placeOrderStripe);
orderRouter.post('/razorpay',authUser,placeOrderRazorpay);
orderRouter.post('/verifyRazorpay',authUser,verifyRazorpay);
orderRouter.post('/verifyStripe',authUser,verifyStripe);
orderRouter.post('/receipt',authUser,getReceipt);
orderRouter.post('/cancel',authUser,cancelOrder);

//user feature
orderRouter.post('/userorders',authUser,userOrders);

export default orderRouter;
