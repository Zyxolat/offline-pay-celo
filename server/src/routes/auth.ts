import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/google', authLimiter, authController.google);
router.post('/webauthn/register/options', authLimiter, authController.webauthnRegisterOptions);
router.post('/webauthn/register/verify', authLimiter, authController.webauthnRegisterVerify);
router.post('/webauthn/login/options', authLimiter, authController.webauthnLoginOptions);
router.post('/webauthn/login/verify', authLimiter, authController.webauthnLoginVerify);
router.post('/logout', authController.logout);

export default router;
