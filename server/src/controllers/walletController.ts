import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { walletService } from '../services/walletService.js';
import { normalizeError } from '../utils/logger.js';
import { successResponse, errorResponse, validateWithSchema } from '../utils/validators.js';
import { z } from 'zod';

const getTransactionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const withdrawSchema = z.object({
  destinationAddress: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/),
  token: z.enum(['CELO', 'cUSD']),
  amount: z.string().trim().refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0),
});

export const walletController = {
  async getBalance(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const balance = await walletService.getBalance(req.user.userId);
      successResponse(res, balance);
    } catch (error) {
      console.error('Get balance error:', normalizeError(error));
      errorResponse(res, 'Failed to fetch balance', 500);
    }
  },

  async getAddress(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const addressData = await walletService.getWalletAddress(req.user.userId);
      successResponse(res, addressData);
    } catch (error) {
      console.error('Get address error:', normalizeError(error));
      errorResponse(res, 'Failed to fetch address', 500);
    }
  },

  async getTransactions(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const query = validateWithSchema(res, getTransactionsQuerySchema, req.query);
      if (!query) {
        return;
      }
      const limit = query.limit ?? 50;
      const offset = query.offset ?? 0;

      const result = await walletService.getTransactionHistory(req.user.userId, limit, offset);
      successResponse(res, result);
    } catch (error) {
      console.error('Get transactions error:', normalizeError(error));
      errorResponse(res, 'Failed to fetch transactions', 500);
    }
  },

  async withdraw(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const payload = validateWithSchema(res, withdrawSchema, req.body);
      if (!payload) {
        return;
      }
      const { destinationAddress, token, amount } = payload;

      const result = await walletService.withdraw(req.user.userId, destinationAddress, token, amount);
      successResponse(res, result, 201);
    } catch (error) {
      const normalizedError = normalizeError(error);
      console.error('Withdraw error:', normalizedError);
      errorResponse(res, normalizedError.message || 'Failed to withdraw funds', 400);
    }
  },
};
