import { NextFunction, Response, Router } from 'express';
import pool from '../config/database.js';
import { AuthSessionModel } from '../models/AuthSession.js';
import { UserModel } from '../models/User.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { tokenService } from '../services/tokenService.js';
import { normalizeError } from '../utils/logger.js';

const router = Router();

const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const activeSessionToken = tokenService.parseAuthHeader(req.headers.authorization);
    if (!activeSessionToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = await AuthSessionModel.findActiveSession(activeSessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const adminUser = await UserModel.findById(req.user.userId);
    if (!adminUser?.is_admin && req.user.role !== 'admin' && !session.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await AuthSessionModel.touch(activeSessionToken);
    next();
  } catch (error) {
    console.error('Admin middleware error:', normalizeError(error));
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (email !== process.env.ADMIN_EMAIL && email !== 'admin@offlinepay.local') {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (password !== expectedPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const adminUser = await UserModel.findAdminByEmail(email);
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    const sessionToken = tokenService.generateToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
      authMethod: 'admin',
    });

    await AuthSessionModel.create(sessionToken, {
      userId: adminUser.id,
      isAdmin: true,
      sessionType: 'admin',
    });

    return res.json({
      success: true,
      data: {
        sessionToken,
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          role: 'admin',
          isAdmin: true,
        },
      },
    });
  } catch (error) {
    console.error('Admin login error:', normalizeError(error));
    return res.status(500).json({ error: 'Failed to log in as admin' });
  }
});

router.get('/stats', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const userStats = await pool.query(`
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END)::int AS new_users_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS new_users_7d
      FROM users
      WHERE is_admin = FALSE
    `);

    const txStats = await pool.query(`
      SELECT
        COUNT(*)::int AS total_transactions,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::int AS completed_transactions,
        COUNT(CASE WHEN status IN ('draft', 'pending_sync', 'submitted') THEN 1 END)::int AS pending_transactions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::int AS failed_transactions,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount END), 0) AS total_volume,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END)::int AS transactions_24h
      FROM transactions
    `);

    const walletStats = await pool.query(`
      SELECT
        COUNT(*)::int AS total_wallets,
        COALESCE(SUM(celo_balance), 0) AS total_celo_balance,
        COALESCE(SUM(cusd_balance), 0) AS total_cusd_balance
      FROM wallets
    `);

    const recentUsers = await pool.query(`
      SELECT u.id, u.email, w.address AS wallet_address, u.created_at
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.is_admin = FALSE
      ORDER BY u.created_at DESC
      LIMIT 10
    `);

    const recentTransactions = await pool.query(`
      SELECT t.id, t.user_id, u.email AS user_email, t.recipient, t.amount, t.currency, t.status, t.created_at
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    res.json({
      data: {
        users: userStats.rows[0],
        transactions: txStats.rows[0],
        wallets: walletStats.rows[0],
        recentUsers: recentUsers.rows,
        recentTransactions: recentTransactions.rows,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', normalizeError(error));
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

router.get('/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    const users = await pool.query(
      `
        SELECT
          u.id,
          u.email,
          u.created_at,
          u.updated_at,
          w.address AS wallet_address,
          COALESCE(w.celo_balance, 0) AS celo_balance,
          COALESCE(w.cusd_balance, 0) AS cusd_balance,
          COUNT(t.id)::int AS transaction_count,
          COALESCE(SUM(CASE WHEN t.status = 'confirmed' THEN t.amount END), 0) AS total_volume
        FROM users u
        LEFT JOIN wallets w ON w.user_id = u.id
        LEFT JOIN transactions t ON u.id = t.user_id
        WHERE u.is_admin = FALSE
        GROUP BY u.id, u.email, u.created_at, u.updated_at, w.address, w.celo_balance, w.cusd_balance
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    const total = await pool.query(
      `SELECT COUNT(*)::int AS count FROM users WHERE is_admin = FALSE`
    );

    res.json({
      data: {
        users: users.rows,
        pagination: {
          page,
          limit,
          total: total.rows[0].count,
          pages: Math.ceil(total.rows[0].count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin users error:', normalizeError(error));
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/transactions', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    const transactions = await pool.query(
      `
        SELECT
          t.id,
          t.user_id,
          u.email AS user_email,
          t.recipient,
          t.amount,
          t.currency,
          t.status,
          t.tx_hash,
          t.created_at,
          t.updated_at
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    const total = await pool.query('SELECT COUNT(*)::int AS count FROM transactions');

    res.json({
      data: {
        transactions: transactions.rows,
        pagination: {
          page,
          limit,
          total: total.rows[0].count,
          pages: Math.ceil(total.rows[0].count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin transactions error:', normalizeError(error));
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/wallets', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    const wallets = await pool.query(
      `
        SELECT
          w.id,
          w.user_id,
          u.email AS user_email,
          w.address,
          w.celo_balance,
          w.cusd_balance,
          w.created_at,
          w.updated_at
        FROM wallets w
        LEFT JOIN users u ON w.user_id = u.id
        ORDER BY w.created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    const total = await pool.query('SELECT COUNT(*)::int AS count FROM wallets');

    res.json({
      data: {
        wallets: wallets.rows,
        pagination: {
          page,
          limit,
          total: total.rows[0].count,
          pages: Math.ceil(total.rows[0].count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin wallets error:', normalizeError(error));
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

export default router;
