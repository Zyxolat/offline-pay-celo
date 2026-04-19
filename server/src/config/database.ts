import pkg from 'pg';
import { config } from './index.js';
import { log, serializeError } from '../utils/logger.js';

const { Pool } = pkg;
const MAX_CONNECTION_RETRIES = 10;
const CONNECTION_TIMEOUT_MS = 7000;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 30000;
const RETRYABLE_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENETUNREACH',
  'EHOSTUNREACH',
  '57P01',
  '53300',
]);
const FAIL_FAST_ERROR_CODES = new Set([
  '28P01',
  '3D000',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

const poolConfig = config.db.url
  ? {
      connectionString: config.db.url,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : undefined;

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

function isFailFastError(error: unknown) {
  const code = getErrorCode(error);
  return code ? FAIL_FAST_ERROR_CODES.has(code) : false;
}

function isRetryableError(error: unknown) {
  const code = getErrorCode(error);
  if (!code) {
    return true;
  }

  if (FAIL_FAST_ERROR_CODES.has(code)) {
    return false;
  }

  return RETRYABLE_ERROR_CODES.has(code);
}

function openCircuit(error: unknown) {
  const cooldownUntil = new Date(Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS).toISOString();
  databaseState.circuitState = 'open';
  databaseState.phase = 'failed';
  databaseState.cooldownUntil = cooldownUntil;

  log('WARN', 'Database circuit breaker opened', {
    cooldownMs: CIRCUIT_BREAKER_COOLDOWN_MS,
    cooldownUntil,
    error: serializeError(error),
  });
}

pool.on('error', (error: Error & { code?: string }) => {
  databaseState.isConnected = false;
  databaseState.isReady = false;
  databaseState.phase = 'failed';
  databaseState.lastError = serializeError(error);

  log('ERROR', 'Unexpected PostgreSQL pool error', {
    ...serializeError(error),
    ...(error.code ? { code: error.code } : {}),
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
    mode: config.db.url ? 'database_url' : 'local',
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

  for (let attempt = 1; attempt <= MAX_CONNECTION_RETRIES; attempt += 1) {
    if (databaseState.circuitState === 'open') {
      const cooldownUntil = databaseState.cooldownUntil ? new Date(databaseState.cooldownUntil).getTime() : 0;
      const remainingMs = Math.max(0, cooldownUntil - Date.now());

      if (remainingMs > 0) {
        log('WARN', 'Database circuit breaker cooldown active', {
          remainingMs,
          cooldownUntil: databaseState.cooldownUntil,
        });
        await sleep(remainingMs);
      }

      databaseState.circuitState = 'half_open';
      databaseState.phase = 'connecting';
      log('INFO', 'Database circuit breaker moved to half-open state');
    }

    databaseState.attempts = attempt;

    log('INFO', 'Attempting PostgreSQL connection', {
      attempt,
      maxRetries: MAX_CONNECTION_RETRIES,
      timeoutMs: CONNECTION_TIMEOUT_MS,
    });

    try {
      await verifyDatabaseConnection();
      databaseState.isConnecting = false;
      databaseState.isConnected = true;
      databaseState.isReady = true;

      log('INFO', 'PostgreSQL is ready', {
        attempt,
        connectedAt: databaseState.lastConnectedAt,
      });

      return true;
    } catch (error) {
      databaseState.isConnected = false;
      databaseState.isReady = false;
      databaseState.phase = 'failed';
      databaseState.lastError = serializeError(error);
      databaseState.consecutiveFailures += 1;
      const failFast = isFailFastError(error);
      const retryable = isRetryableError(error);

      log('WARN', 'PostgreSQL connection attempt failed', {
        attempt,
        maxRetries: MAX_CONNECTION_RETRIES,
        retryInMs: attempt < MAX_CONNECTION_RETRIES ? getRetryDelay(attempt) : 0,
        code: getErrorCode(error),
        failFast,
        retryable,
        error: serializeError(error),
      });

      if (failFast) {
        databaseState.isConnecting = false;
        openCircuit(error);
        log('ERROR', 'PostgreSQL connection failed with non-retryable error', {
          code: getErrorCode(error),
          error: serializeError(error),
        });
        process.exit(1);
      }

      if (!retryable || databaseState.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
        openCircuit(error);
      }

      if (attempt === MAX_CONNECTION_RETRIES) {
        databaseState.isConnecting = false;
        log('ERROR', 'PostgreSQL connection retries exhausted', {
          attempts: MAX_CONNECTION_RETRIES,
          error: serializeError(error),
        });
        process.exit(1);
      }

      await sleep(getRetryDelay(attempt));
    }
  }

  databaseState.isConnecting = false;
  return false;
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
