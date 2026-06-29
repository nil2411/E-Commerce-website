import express from 'express';
import { adminLogin } from '../controllers/userControllerV2.js';
import { authRateLimiter } from '../middleware/security.js';

const adminRoutes = express.Router();

adminRoutes.post('/login', authRateLimiter, adminLogin);

export default adminRoutes;
