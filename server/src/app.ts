import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { limiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAdvancedAuthTables } from './models/AdvancedAuthMigration.js';
import { verifyDatabaseConnection } from './config/database.js';

import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import paymentRoutes from './routes/payments.js';
import queueRoutes from './routes/queue.js';
import transactionRoutes from './routes/transactions.js';
import adminRoutes from './routes/admin.js';

const app = express();
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

// Security middleware
app.use(helmet());

// Log CORS configuration
console.log(`🔐 CORS enabled for: ${config.frontend.url}`);
console.log(`🔐 WebAuthn Origin: ${config.webauthn.origin}`);
if (config.nodeEnv !== 'production') {
  console.log('🔐 Local development CORS enabled for localhost origins');
}

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const isConfiguredOrigin = origin === config.frontend.url;
    const isLocalDevOrigin =
      config.nodeEnv !== 'production' && localhostOriginPattern.test(origin);

    if (isConfiguredOrigin || isLocalDevOrigin) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Logging
app.use(morgan('combined'));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(limiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Error handler
app.use(errorHandler);

const PORT = config.port;

// Run migrations on startup
async function startServer() {
  try {
    await verifyDatabaseConnection();
    await createAdvancedAuthTables();
    
    app.listen(PORT, () => {
      console.log(`OfflinePay API Server running on port ${PORT}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Celo Network: ${config.celo.network}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
