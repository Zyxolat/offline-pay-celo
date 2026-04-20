import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import type { Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { closeDatabasePool, connectDatabaseWithRetry, getDatabaseStatus } from './config/database.js';
import { limiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { log, normalizeError } from './utils/logger.js';

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
let isShuttingDown = false;
let server: Server | null = null;
let hasRegisteredGlobalErrorHandlers = false;
let hasStartedServer = false;

app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

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

// Request logger middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id']?.toString() || crypto.randomUUID();
  const start = Date.now();
  let responseStarted = false;
  const logResponseStart = () => {
    if (responseStarted) {
      return;
    }

    responseStarted = true;
    log('INFO', 'HTTP response started', {
      requestId,
      method: req.method,
      route: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: Date.now() - start,
    });
  };
  const originalWriteHead = res.writeHead.bind(res);
  res.writeHead = ((...args: Parameters<Response['writeHead']>) => {
    logResponseStart();
    return originalWriteHead(...args);
  }) as Response['writeHead'];

  res.setHeader('x-request-id', requestId);
  res.locals.requestId = requestId;

  log('INFO', 'HTTP request received', {
    requestId,
    method: req.method,
    route: req.originalUrl,
    timestamp: new Date(start).toISOString(),
  });

  res.on('finish', () => {
    const database = getDatabaseStatus();
    log('INFO', 'HTTP request completed', {
      requestId,
      method: req.method,
      route: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: Date.now() - start,
      dbStatus: database.phase,
    });
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      log('WARN', 'HTTP request closed before response finished', {
        requestId,
        method: req.method,
        route: req.originalUrl,
        latencyMs: Date.now() - start,
      });
    }
  });

  next();
});

// Logging
app.use(morgan('combined'));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req: Request, res: Response) => {
  const database = getDatabaseStatus();

  res.status(200).json({
    status: 'ok',
    service: 'offlinepay-backend',
    environment: config.nodeEnv,
    uptime: process.uptime(),
    db: database.phase,
    timestamp: new Date().toISOString(),
  });
});

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

// Rate limiting
app.use('/api', limiter);

// Keep API responsive while dependencies warm up.
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const database = getDatabaseStatus();

  if (!database.isReady) {
    res.setHeader('x-service-state', 'warming-up');
  }

  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Error handler
app.use(errorHandler);

const PORT = Number.parseInt(process.env.PORT ?? '', 10) || config.port;
const serverBootstrapState = globalThis as typeof globalThis & {
  __server_started__?: boolean;
};

function registerGlobalErrorHandlers() {
  if (hasRegisteredGlobalErrorHandlers) {
    return;
  }

  hasRegisteredGlobalErrorHandlers = true;

  process.on('uncaughtException', (error) => {
    log('ERROR', 'Uncaught exception', normalizeError(error));
  });

  process.on('unhandledRejection', (reason) => {
    log('ERROR', 'Unhandled promise rejection', normalizeError(reason));
  });
}

export function startServer() {
  if (hasStartedServer) {
    return server;
  }

  hasStartedServer = true;

  log('INFO', 'Starting API server', {
    host: HOST,
    port: PORT,
    environment: config.nodeEnv,
  });

  server = app.listen(PORT, HOST, () => {
    log('INFO', 'API server is listening', {
      host: HOST,
      port: PORT,
      environment: config.nodeEnv,
      celoNetwork: config.celo.network,
    });

    void (async () => {
      try {
        await connectDatabaseWithRetry();
      } catch (error) {
        log('ERROR', 'DB connection failed', normalizeError(error));
      }
    })();
  });

  server.keepAliveTimeout = 60_000;
  server.headersTimeout = 65_000;
  server.requestTimeout = 30_000;
  server.timeout = 30_000;

  server.on('timeout', () => {
    log('WARN', 'HTTP server timed out a request');
  });

  server.on('error', (error) => {
    log('ERROR', 'HTTP server failed to start', normalizeError(error));

    process.exit(1);
  });

  return server;
}

// Graceful shutdown
async function shutdown(signal: 'SIGTERM' | 'SIGINT') {
  if (isShuttingDown) return;

  isShuttingDown = true;

  log('INFO', 'Shutdown initiated', {
    signal,
    uptimeSeconds: process.uptime(),
  });

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) return reject(error);
          resolve();
        });
      });

      log('INFO', 'HTTP server closed');
    }

    await closeDatabasePool();
    log('INFO', 'Shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    log('ERROR', 'Shutdown failed', normalizeError(error));

    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

function shouldAutoStart() {
  const entryArg = process.argv[1];

  if (!entryArg) {
    return false;
  }

  return import.meta.url === pathToFileURL(entryArg).href;
}

export function bootServer() {
  registerGlobalErrorHandlers();

  if (serverBootstrapState.__server_started__) {
    console.log('Server already started - skipping duplicate init');
    return server;
  }

  serverBootstrapState.__server_started__ = true;
  return startServer();
}

if (shouldAutoStart()) {
  bootServer();
}

export default app;
