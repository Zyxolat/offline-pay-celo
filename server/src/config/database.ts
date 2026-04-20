import pkg from 'pg';
import { config } from './index.js';
import { log, serializeError } from '../utils/logger.js';

const { Pool } = pkg;
const CONNECTION_TIMEOUT_MS = 10000;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const RETRYABLE_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENETUNREACH',
  'EHOSTUNREACH',
  '57P01',
  '53300',
]);

const isProduction = config.nodeEnv === 'production';
const poolConfig = config.db.url
  ? {
      connectionString: config.db.url,
      ssl: isProduction
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      ...config.db.local,
      ssl: false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);
type DatabasePhase = 'connecting' | 'connected' | 'failed';
const databaseState = {
  isConnected: false,
  isReady: false,
  isConnecting: false,
  attempts: 0,
  lastConnectedAt: null as string | null,
  lastError: null as ReturnType<typeof serializeError> | null,
  phase: 'connecting' as DatabasePhase,
  circuitState: 'closed' as 'closed' | 'open' | 'half_open',
  consecutiveFailures: 0,
  cooldownUntil: null as string | null,
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function getRetryDelay(attempt: number) {
  return Math.min(INITIAL_RETRY_DELAY_MS * 2 ** Math.max(0, attempt - 1), MAX_RETRY_DELAY_MS);
}

function getErrorCode(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code?: string }).code);
  }

  return undefined;
}

function isRetryableError(error: unknown) {
  const code = getErrorCode(error);
  return code ? RETRYABLE_ERROR_CODES.has(code) : true;
}

function getConnectionLogMeta() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  return {
    source: config.db.source,
    hasDatabaseUrl: Boolean(databaseUrl),
    databaseUrlPreview: databaseUrl ? `${databaseUrl.slice(0, 30)}...` : undefined,
    ssl: Boolean(poolConfig.ssl),
    host: config.db.url ? undefined : config.db.local?.host,
    port: config.db.url ? undefined : config.db.local?.port,
    database: config.db.url ? undefined : config.db.local?.database,
    nodeEnv: config.nodeEnv,
  };
}

pool.on('error', (error: Error & { code?: string }) => {
  databaseState.isConnected = false;
  databaseState.isReady = false;
  databaseState.phase = 'failed';
  databaseState.lastError = serializeError(error);

  log('ERROR', 'Unexpected PostgreSQL pool error', {
    ...serializeError(error),
    ...(error.code ? { code: error.code } : {}),
    ...getConnectionLogMeta(),
  });

  if (!databaseState.isConnecting) {
    void connectDatabaseWithRetry();
  }
});

pool.on('connect', () => {
  databaseState.isConnected = true;
  databaseState.isReady = true;
  databaseState.lastConnectedAt = new Date().toISOString();
  databaseState.lastError = null;
  databaseState.phase = 'connected';
  databaseState.circuitState = 'closed';
  databaseState.consecutiveFailures = 0;
  databaseState.cooldownUntil = null;

  log('INFO', 'PostgreSQL connection established', {
    ...getConnectionLogMeta(),
  });
});

export async function verifyDatabaseConnection() {
  const client = await withTimeout(pool.connect(), CONNECTION_TIMEOUT_MS, 'Database connection');

  try {
    const result = await withTimeout(
      client.query<{ now: Date }>('SELECT NOW() AS now'),
      CONNECTION_TIMEOUT_MS,
      'Database query'
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

export function getDatabaseStatus() {
  return { ...databaseState };
}

export async function connectDatabaseWithRetry() {
  if (databaseState.isConnecting) {
    return databaseState.isReady;
  }

  databaseState.isConnecting = true;
  databaseState.phase = 'connecting';
  databaseState.circuitState = 'half_open';

  const databaseUrl = process.env.DATABASE_URL?.trim();
  console.log('DB URL:', databaseUrl ? `${databaseUrl.slice(0, 30)}...` : 'not set');

  for (let attempt = 1; ; attempt += 1) {
    databaseState.attempts = attempt;

    log('INFO', 'Attempting PostgreSQL connection', {
      attempt,
      timeoutMs: CONNECTION_TIMEOUT_MS,
      ...getConnectionLogMeta(),
    });

    try {
      const client = await withTimeout(pool.connect(), CONNECTION_TIMEOUT_MS, 'Database connection');

      console.log('✅ Connected to PostgreSQL');

      try {
        await withTimeout(
          client.query<{ now: Date }>('SELECT NOW() AS now'),
          CONNECTION_TIMEOUT_MS,
          'Database query'
        );
      } finally {
        client.release();
      }

      databaseState.isConnecting = false;
      databaseState.isConnected = true;
      databaseState.isReady = true;
      databaseState.phase = 'connected';
      databaseState.circuitState = 'closed';
      databaseState.cooldownUntil = null;
      databaseState.lastError = null;

      log('INFO', 'PostgreSQL is ready', {
        attempt,
        connectedAt: databaseState.lastConnectedAt,
      });

      return true;
    } catch (error) {
      databaseState.isConnected = false;
      databaseState.isReady = false;
      databaseState.phase = 'failed';
      databaseState.circuitState = 'half_open';
      databaseState.lastError = serializeError(error);
      databaseState.consecutiveFailures += 1;
      const retryable = isRetryableError(error);
      const retryInMs = getRetryDelay(attempt);

      console.error(
        '❌ PostgreSQL connection error:',
        error instanceof Error ? error.message : String(error)
      );

      log('WARN', 'PostgreSQL connection attempt failed', {
        attempt,
        retryInMs,
        code: getErrorCode(error),
        retryable,
        error: serializeError(error),
        ...getConnectionLogMeta(),
      });

      log('ERROR', 'PostgreSQL connection failed; retry scheduled', {
        code: getErrorCode(error),
        retryInMs,
        hint: isProduction
          ? 'Verify Railway DATABASE_URL and SSL-enabled PostgreSQL access.'
          : 'Verify local PostgreSQL env vars or provide DATABASE_URL.',
        ...getConnectionLogMeta(),
      });

      await sleep(retryable ? retryInMs : MAX_RETRY_DELAY_MS);
    }
  }
}

export async function closeDatabasePool() {
  log('INFO', 'Closing PostgreSQL connection pool');
  await pool.end();
  databaseState.isConnected = false;
  databaseState.isReady = false;
  databaseState.isConnecting = false;
  databaseState.phase = 'failed';
}

export default pool;
