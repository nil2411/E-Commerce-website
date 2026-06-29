import express from 'express'
import {
    userLogin,userRegister,refreshSession,logout,adminLogin,verifyEmail,
    forgotPassword,resetPassword,getProfile,updateProfile
} from '../controllers/userControllerV2.js'
import authUser from '../middleware/auth.js'
import { authRateLimiter } from '../middleware/security.js'


const userRoutes = express.Router();

userRoutes.post('/login',authRateLimiter,userLogin);
userRoutes.post('/register',authRateLimiter,userRegister);
userRoutes.post('/refresh',refreshSession);
userRoutes.post('/logout',logout);
userRoutes.post('/verify-email',verifyEmail);
userRoutes.post('/forgot-password',authRateLimiter,forgotPassword);
userRoutes.post('/reset-password',authRateLimiter,resetPassword);
userRoutes.get('/profile',authUser,getProfile);
userRoutes.put('/profile',authUser,updateProfile);
userRoutes.post('/admin',authRateLimiter,adminLogin);
userRoutes.post('/admin/login',authRateLimiter,adminLogin);

export default userRoutes; 
