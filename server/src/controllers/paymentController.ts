import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { transactionService } from '../services/transactionService.js';
import { ChallengeModel } from '../models/Challenge.js';
import { celoService } from '../services/celoService.js';
import { normalizeError } from '../utils/logger.js';
import { successResponse, errorResponse, validateAddress, validateAmount } from '../utils/validators.js';
import { randomBytes } from 'crypto';

export const paymentController = {
  async authorizeChallenge(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { recipient, amount, currency, note } = req.body;

      // Validate inputs
      if (!validateAddress(recipient)) {
        return errorResponse(res, 'Invalid recipient address', 400);
      }

      if (!validateAmount(amount)) {
        return errorResponse(res, 'Invalid amount', 400);
      }

      if (!['cUSD', 'CELO'].includes(currency)) {
        return errorResponse(res, 'Invalid currency', 400);
      }

      // Create payment record
      const payment = await transactionService.createPayment(
        req.user.userId,
        recipient,
        amount,
        currency,
        note
      );

      // Generate challenge
      const challenge = randomBytes(32);
      await ChallengeModel.create(challenge, 'payment', req.user.userId, payment.id);

      // Estimate fee
      const estimatedFee = await celoService.estimateGasFee();

      successResponse(res, {
        challenge: challenge.toString('base64'),
        paymentId: payment.id,
        timeout: 60000,
        details: {
          recipient,
          amount,
          currency,
          estimatedFee,
        },
      });
    } catch (error) {
      const normalizedError = normalizeError(error);
      console.error('Authorize challenge error:', normalizedError);
      errorResponse(res, `Failed to authorize payment: ${normalizedError.message}`, 400);
    }
  },

  async authorizeVerify(req: AuthRequest, res: Response) {
    try {
      const { paymentId, credentialId, response } = req.body;

      if (!paymentId || !credentialId || !response) {
        return errorResponse(res, 'Missing required fields', 400);
      }

      // Verify challenge exists and hasn't expired
      // In production, would verify the WebAuthn response here
      const challenge = await ChallengeModel.findActivePaymentChallenge(paymentId);
      if (!challenge) {
        return errorResponse(res, 'Challenge not found or expired', 400);
      }

      await ChallengeModel.delete(challenge.id);

      // Authorization successful
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      successResponse(res, {
        success: true,
        paymentId,
        authorized: true,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error('Authorize verify error:', normalizeError(error));
      errorResponse(res, 'Failed to verify authorization', 400);
    }
  },

  async submitPayment(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { paymentId, signedTx, offline } = req.body;

      if (!paymentId || !signedTx) {
        return errorResponse(res, 'Missing required fields', 400);
      }

      if (offline) {
        // Queue the transaction for later sync
        successResponse(
          res,
          {
            queueId: paymentId,
            status: 'pending_sync',
            message: 'Transaction queued. Will sync when online.',
          },
          202
        );
      } else {
        // Submit immediately
        const result = await transactionService.submitTransaction(req.user.userId, paymentId, signedTx);

        successResponse(res, result);
      }
    } catch (error) {
      const normalizedError = normalizeError(error);
      console.error('Submit payment error:', normalizedError);
      errorResponse(res, `Failed to submit payment: ${normalizedError.message}`, 400);
    }
  },
};
