import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { queueService } from '../services/queueService.js';
import { normalizeError } from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/validators.js';

export const queueController = {
  async addToQueue(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { recipient, amount, currency, signedTx, note, timestamp } = req.body;

      if (!signedTx) {
        return errorResponse(res, 'Missing signed transaction', 400);
      }

      const result = await queueService.addToQueue(req.user.userId, signedTx);

      successResponse(res, result, 201);
    } catch (error) {
      const normalizedError = normalizeError(error);
      console.error('Add to queue error:', normalizedError);
      errorResponse(res, `Failed to queue transaction: ${normalizedError.message}`, 400);
    }
  },

  async getPending(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const result = await queueService.getPendingQueue(req.user.userId);
      successResponse(res, result);
    } catch (error) {
      console.error('Get pending queue error:', normalizeError(error));
      errorResponse(res, 'Failed to fetch pending transactions', 500);
    }
  },

  async sync(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { queueIds } = req.body;

      const result = await queueService.syncQueue(req.user.userId, queueIds);
      successResponse(res, result);
    } catch (error) {
      console.error('Sync queue error:', normalizeError(error));
      errorResponse(res, 'Failed to sync transactions', 500);
    }
  },
};
