import pool from '../config/database.js';
import { randomUUID } from 'crypto';

export type TransactionStatus = 'draft' | 'pending_sync' | 'submitted' | 'confirmed' | 'failed';
export type TransactionType = 'send' | 'receive';

export interface Transaction {
  id: string;
  user_id: string;
  recipient: string;
  amount: string;
  currency: string;
  status: TransactionStatus;
  tx_hash?: string;
  signed_tx?: string;
  note?: string;
  created_at: Date;
  updated_at?: Date;
  submitted_at?: Date;
  confirmed_at?: Date;
  confirmations: number;
}

export const TransactionModel = {
  async create(
    userId: string,
    recipient: string,
    amount: string,
    currency: string,
    note?: string
  ): Promise<Transaction> {
    const id = randomUUID();
    const now = new Date();
    const result = await pool.query(
      `INSERT INTO transactions (id, user_id, recipient, amount, currency, status, note, created_at, updated_at, confirmations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [id, userId, recipient, amount, currency, 'draft', note || null, now, now, 0]
    );
    return result.rows[0];
  },

  async findById(id: string): Promise<Transaction | null> {
    const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByUser(userId: string, limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return result.rows;
  },

  async findByTxHash(txHash: string): Promise<Transaction | null> {
    const result = await pool.query('SELECT * FROM transactions WHERE tx_hash = $1', [txHash]);
    return result.rows[0] || null;
  },

  async updateStatus(id: string, status: TransactionStatus, txHash?: string): Promise<Transaction> {
    const updates: Record<string, TransactionStatus | string | Date> = {
      status,
      updated_at: new Date(),
    };
    if (status === 'submitted' && txHash) {
      updates.tx_hash = txHash;
      updates.submitted_at = new Date();
    } else if (status === 'confirmed') {
      updates.confirmed_at = new Date();
    }

    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`);
    const values = Object.values(updates);
    values.push(id);

    const result = await pool.query(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async updateConfirmations(txHash: string, confirmations: number): Promise<void> {
    await pool.query('UPDATE transactions SET confirmations = $1 WHERE tx_hash = $2', [confirmations, txHash]);
  },

  async countByUser(userId: string): Promise<number> {
    const result = await pool.query('SELECT COUNT(*) FROM transactions WHERE user_id = $1', [userId]);
    return parseInt(result.rows[0].count, 10);
  },
};
