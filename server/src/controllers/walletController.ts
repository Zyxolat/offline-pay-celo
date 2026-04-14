import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { walletService } from '../services/walletService.js';
import { successResponse, errorResponse } from '../utils/validators.js';

export const walletController = {
  async getBalance(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const balance = await walletService.getBalance(req.user.userId);
      successResponse(res, balance);
    } catch (error) {
      console.error('Get balance error:', error);
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
      console.error('Get address error:', error);
      errorResponse(res, 'Failed to fetch address', 500);
    }
  },

  async getTransactions(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await walletService.getTransactionHistory(req.user.userId, limit, offset);
      successResponse(res, result);
    } catch (error) {
      console.error('Get transactions error:', error);
      errorResponse(res, 'Failed to fetch transactions', 500);
    }
  },

  async withdraw(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { destinationAddress, token, amount } = req.body;

      if (!destinationAddress || !token || !amount) {
        return errorResponse(res, 'destinationAddress, token, and amount are required', 400);
      }

      const result = await walletService.withdraw(req.user.userId, destinationAddress, token, amount);
      successResponse(res, result, 201);
    } catch (error: any) {
      console.error('Withdraw error:', error);
      errorResponse(res, error?.message || 'Failed to withdraw funds', 400);
    }
  },
};
