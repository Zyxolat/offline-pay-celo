import { Router } from 'express';
import { transactionController } from '../controllers/transactionController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/status/batch', transactionController.getStatusBatch);
router.get('/:txId', transactionController.getDetail);

export default router;
