import { Router } from 'express';
import { walletController } from '../controllers/walletController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/balance', walletController.getBalance);
router.get('/address', walletController.getAddress);
router.get('/transactions', walletController.getTransactions);
router.post('/transactions/sync', walletController.syncTransaction);
router.post('/withdraw', walletController.withdraw);

export default router;
