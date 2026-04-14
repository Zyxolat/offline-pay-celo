import { Router } from 'express';
import { paymentController } from '../controllers/paymentController.js';
import { authMiddleware } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/authorize/challenge', authMiddleware, paymentController.authorizeChallenge);
router.post('/authorize/verify', paymentController.authorizeVerify);
router.post('/submit', paymentLimiter, authMiddleware, paymentController.submitPayment);

export default router;
