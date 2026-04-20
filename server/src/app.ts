import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import type { Server } from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { closeDatabasePool, connectDatabaseWithRetry, getDatabaseStatus } from './config/database.js';
import { limiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { log, serializeError } from './utils/logger.js';

import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import paymentRoutes from './routes/payments.js';
import queueRoutes from './routes/queue.js';
import transactionRoutes from './routes/transactions.js';
import adminRoutes from './routes/admin.js';

const app = express();
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
const HOST = '0.0.0.0';
const allowedOrigins = new Set(config.frontend.allowedOrigins);
const bootTime = Date.now();
let isShuttingDown = false;
let server: Server | null = null;

// Security middleware
app.use(helmet());

// Log CORS configuration
log('INFO', 'Configured CORS origins', {
  origins: Array.from(allowedOrigins),
});
log('INFO', 'Configured WebAuthn origin', {
  origin: config.webauthn.origin,
});
if (config.nodeEnv !== 'production') {
  log('INFO', 'Local development CORS enabled for localhost origins');
}

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const isConfiguredOrigin = allowedOrigins.has(origin.replace(/\/+$/, ''));
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

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id']?.toString() || crypto.randomUUID();
  const start = Date.now();
  const database = getDatabaseStatus();

  res.setHeader('x-request-id', requestId);
  res.locals.requestId = requestId;

  res.on('finish', () => {
    log('INFO', 'HTTP request completed', {
      requestId,
      method: req.method,
      route: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: Date.now() - start,
      dbStatus: database.phase,
    });
  });

  next();
});

// Logging
app.use(morgan('combined'));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(limiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req: Request, res: Response) => {
  const database = getDatabaseStatus();
  const ready = config.validation.criticalEnvLoaded && database.isReady;

  res.status(ready ? 200 : 503).json({
    db: ready ? 'connected' : database.isConnecting ? 'connecting' : 'failed',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/status', (req: Request, res: Response) => {
  const database = getDatabaseStatus();

  res.json({
    uptime: process.uptime(),
    environment: config.nodeEnv,
    db: {
      phase: database.phase,
      isReady: database.isReady,
      isConnecting: database.isConnecting,
      attempts: database.attempts,
      circuitState: database.circuitState,
      lastConnectedAt: database.lastConnectedAt,
      cooldownUntil: database.cooldownUntil,
    },
    memory: process.memoryUsage(),
    shuttingDown: isShuttingDown,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const database = getDatabaseStatus();

  if (!database.isReady) {
    res.setHeader('Retry-After', '3');
    return res.status(503).json({
      error: 'service warming up',
      retryAfter: 3,
    });
  }

  next();
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

function startServer() {
  log('INFO', 'Starting API server', {
    host: HOST,
    port: PORT,
    environment: config.nodeEnv,
  });

  server = app.listen(PORT, '0.0.0.0', () => {
    log('INFO', 'API server is listening', {
      host: HOST,
      port: PORT,
      environment: config.nodeEnv,
      celoNetwork: config.celo.network,
    });

    void connectDatabaseWithRetry();
  });

  server.on('error', (error) => {
    log('ERROR', 'HTTP server failed to start', serializeError(error));
    process.exit(1);
  });
}

async function shutdown(signal: 'SIGTERM' | 'SIGINT') {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  log('INFO', 'Shutdown initiated', {
    signal,
    uptimeSeconds: process.uptime(),
  });

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
      log('INFO', 'HTTP server closed');
    }

    await closeDatabasePool();
    log('INFO', 'Shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    log('ERROR', 'Shutdown failed', serializeError(error));
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

export default app;
