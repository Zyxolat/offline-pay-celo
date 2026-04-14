import { TransactionModel } from '../models/Transaction.js';
import { UserModel } from '../models/User.js';
import { celoService } from './celoService.js';

export const transactionService = {
  async createPayment(
    userId: string,
    recipient: string,
    amount: string,
    currency: string,
    note?: string
  ): Promise<any> {
    // Validate user exists
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('User not found');

    // Validate recipient address
    const isValid = await celoService.validateAddress(recipient);
    if (!isValid) throw new Error('Invalid recipient address');

    // Can't send to self
    if (recipient.toLowerCase() === user.wallet_address.toLowerCase()) {
      throw new Error('Cannot send payment to yourself');
    }

    // Create transaction record
    const tx = await TransactionModel.create(userId, recipient, amount, currency, note);

    return {
      id: tx.id,
      status: tx.status,
      recipient: tx.recipient,
      amount: tx.amount,
      currency: tx.currency,
      createdAt: tx.created_at,
    };
  },

  async getTransactionDetails(userId: string, txId: string): Promise<any> {
    const tx = await TransactionModel.findById(txId);
    if (!tx || tx.user_id !== userId) {
      throw new Error('Transaction not found');
    }

    return {
      id: tx.id,
      status: tx.status,
      from: (await UserModel.findById(userId))?.wallet_address,
      to: tx.recipient,
      amount: tx.amount,
      currency: tx.currency,
      txHash: tx.tx_hash,
      timestamp: tx.created_at,
      submittedAt: tx.submitted_at,
      confirmedAt: tx.confirmed_at,
      confirmations: tx.confirmations,
      note: tx.note,
    };
  },

  async submitTransaction(userId: string, txId: string, signedTx: string): Promise<any> {
    const tx = await TransactionModel.findById(txId);
    if (!tx || tx.user_id !== userId) {
      throw new Error('Transaction not found');
    }

    // Verify the signed transaction
    const isValid = await celoService.verifyTransaction(signedTx);
    if (!isValid) throw new Error('Invalid signed transaction');

    try {
      // Submit to blockchain
      const txHash = await celoService.submitTransaction(signedTx);

      // Update transaction record
      const updated = await TransactionModel.updateStatus(txId, 'submitted', txHash);

      return {
        txHash,
        status: 'submitted',
        confirmations: 0,
      };
    } catch (error) {
      throw new Error(`Failed to submit transaction: ${error}`);
    }
  },

  async updateTransactionStatus(txHash: string): Promise<void> {
    const tx = await TransactionModel.findByTxHash(txHash);
    if (!tx) return;

    const statusInfo = await celoService.getTransactionStatus(txHash);
    if (!statusInfo) return;

    const status = statusInfo.status === 'confirmed' ? 'confirmed' : 'failed';
    await TransactionModel.updateStatus(tx.id, status as any);
    await TransactionModel.updateConfirmations(txHash, statusInfo.confirmations);
  },
};
