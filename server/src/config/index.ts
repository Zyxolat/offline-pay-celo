import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.join(__dirname, '../..');

dotenv.config({ path: path.join(serverRoot, '.env') });
const configWarnings: string[] = [];

function warnConfig(message: string, meta?: Record<string, unknown>) {
  configWarnings.push(message);
  log('WARN', message, meta);
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    warnConfig('Missing required environment variable; using fallback', { name });
    return '';
  }

  return value;
}

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function tryParseOrigin(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getFrontendOrigins(): string[] {
  const rawValue = process.env.FRONTEND_URL?.trim();
  const isProd = isProduction();
  const rawOrigins = rawValue
    ? rawValue.split(',').map((origin) => normalizeOrigin(origin)).filter(Boolean)
    : isProd
      ? []
      : ['http://localhost:5173'];

  const validOrigins: string[] = [];

  for (const origin of rawOrigins) {
    const parsed = tryParseOrigin(origin);

    if (!parsed) {
      log('WARN', 'Ignoring malformed FRONTEND_URL origin', { origin });
      continue;
    }

    validOrigins.push(parsed.origin);
  }

  if (validOrigins.length === 0) {
    const webauthnFallback = process.env.WEBAUTHN_ORIGIN?.trim();
    const parsedFallback = webauthnFallback ? tryParseOrigin(normalizeOrigin(webauthnFallback)) : null;

    if (parsedFallback) {
      log('WARN', 'No valid FRONTEND_URL origins found; falling back to WEBAUTHN_ORIGIN', {
        fallbackOrigin: parsedFallback.origin,
      });
      return [parsedFallback.origin];
    }

    if (isProd) {
      warnConfig('FRONTEND_URL is missing or invalid in production');
      return [];
    }

    log('WARN', 'No valid FRONTEND_URL origins found; falling back to localhost only');
    return ['http://localhost:5173'];
  }

  return [...new Set(validOrigins)];
}

export function isAllowedVercelOrigin(origin: string) {
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
}

function getWebauthnOrigin(frontendOrigin: string): string {
  const rawValue = process.env.WEBAUTHN_ORIGIN?.trim();
  const isDevDefault =
    !rawValue ||
    rawValue === 'http://localhost:5173' ||
    rawValue === 'http://127.0.0.1:5173';
  const value = normalizeOrigin(
    isProduction() && isDevDefault ? frontendOrigin : (rawValue || frontendOrigin).trim()
  );
  const parsed = tryParseOrigin(value);

  if (!parsed) {
    warnConfig('WEBAUTHN_ORIGIN is invalid; falling back to frontend origin', { value });
    return frontendOrigin;
  }

  if (isProduction() && parsed.protocol !== 'https:') {
    warnConfig('WEBAUTHN_ORIGIN must use https:// in production; falling back to frontend origin', {
      value,
    });
    return frontendOrigin;
  }

  return parsed.origin;
}

function getJwtSecret(): string {
  const fallback = 'offlinepay-dev-secret-change-me';
  const value = (process.env.JWT_SECRET || fallback).trim();

  if (isProduction() && value === fallback) {
    warnConfig('JWT_SECRET is using the development fallback in production');
  }

  return value;
}

function getAdminPassword(): string {
  const fallback = 'admin123';
  const value = (process.env.ADMIN_PASSWORD || fallback).trim();

  if (isProduction() && value === fallback) {
    warnConfig('ADMIN_PASSWORD is using the development fallback in production');
  }

  return value;
}

type DatabaseConfig = {
  url?: string;
  ssl: boolean;
  source: 'database_url' | 'local';
  local?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
};

function parseDatabaseUrl(value: string): URL | null {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    warnConfig('DATABASE_URL is invalid; database connection will rely on fallback settings', {
      valuePreview: value.slice(0, 30),
    });
    return null;
  }

  if (!/^postgres(ql)?:$/i.test(parsed.protocol)) {
    warnConfig('DATABASE_URL must use postgres protocol; database connection will rely on fallback settings', {
      protocol: parsed.protocol,
    });
    return null;
  }

  return parsed;
}

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const isProd = isProduction();

  if (isProd) {
    const requiredUrl = requireEnv('DATABASE_URL');
    const parsed = requiredUrl ? parseDatabaseUrl(requiredUrl) : null;

    if (parsed && /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
      warnConfig('DATABASE_URL points to localhost in production; database may be unreachable', {
        hostname: parsed.hostname,
      });
    }

    return {
      url: parsed ? requiredUrl : undefined,
      ssl: Boolean(parsed),
      source: 'database_url',
    };
  }

  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);

    return {
      url: parsed ? databaseUrl : undefined,
      ssl: false,
      source: parsed ? 'database_url' : 'local',
    };
  }

  return {
    ssl: false,
    source: 'local',
    local: {
      host: process.env.PGHOST?.trim() || process.env.DB_HOST?.trim(),
      port: process.env.PGPORT || process.env.DB_PORT
        ? parsePort(process.env.PGPORT || process.env.DB_PORT, 5432)
        : undefined,
      user: process.env.PGUSER?.trim() || process.env.DB_USER?.trim(),
      password: process.env.PGPASSWORD ?? process.env.DB_PASSWORD,
      database: process.env.PGDATABASE?.trim() || process.env.DB_NAME?.trim(),
    },
  } satisfies DatabaseConfig;
}

const frontendOrigins = getFrontendOrigins();
const primaryFrontendOrigin = frontendOrigins[0] || 'http://localhost:5173';
const webauthnOrigin = getWebauthnOrigin(primaryFrontendOrigin);
const databaseConfig = getDatabaseConfig();

if (isProduction()) {
  if (!process.env.WEBAUTHN_RP_ID?.trim()) {
    warnConfig('WEBAUTHN_RP_ID is missing in production');
  }

  if (!process.env.FRONTEND_URL?.trim()) {
    warnConfig('FRONTEND_URL is missing in production');
  }
}

export const config = {
  port: parsePort(process.env.PORT, 0),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: databaseConfig,

  jwt: {
    secret: getJwtSecret(),
    expiry: process.env.JWT_EXPIRY || '1h',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@offlinepay.local',
    password: getAdminPassword(),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },

  webauthn: {
    rpName: process.env.WEBAUTHN_RP_NAME || 'OfflinePay',
    rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    origin: webauthnOrigin,
  },

  celo: {
    network: process.env.CELO_NETWORK || 'mainnet',
    rpcUrl: process.env.CELO_RPC_URL || 'https://forno.celo.org',
    chainId: parseInt(process.env.CELO_CHAIN_ID || '42220', 10),
    cUSDAddress: process.env.CELO_CUSD_ADDRESS || '0x765DE816845861e75A25fCA122bb6bAA3c1E852a',
    withdrawPrivateKey: process.env.CELO_WITHDRAW_PRIVATE_KEY || '',
  },

  frontend: {
    url: primaryFrontendOrigin,
    allowedOrigins: frontendOrigins,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  validation: {
    criticalEnvLoaded: configWarnings.length === 0,
  },
};
