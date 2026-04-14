import { Router } from 'express';
import { queueController } from '../controllers/queueController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.post('/add', queueController.addToQueue);
router.get('/pending', queueController.getPending);
router.post('/sync', queueController.sync);

export default router;
