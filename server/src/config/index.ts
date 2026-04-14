import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.join(__dirname, '../..');

dotenv.config({ path: path.join(serverRoot, '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'offlinepay',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'offlinepay-dev-secret-change-me',
    expiry: process.env.JWT_EXPIRY || '1h',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@offlinepay.local',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },

  webauthn: {
    rpName: process.env.WEBAUTHN_RP_NAME || 'OfflinePay',
    rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173',
  },

  celo: {
    network: process.env.CELO_NETWORK || 'mainnet',
    rpcUrl: process.env.CELO_RPC_URL || 'https://forno.celo.org',
    chainId: parseInt(process.env.CELO_CHAIN_ID || '42220', 10),
    cUSDAddress: process.env.CELO_CUSD_ADDRESS || '0x765DE816845861e75A25fCA122bb6bAA3c1E852a',
    withdrawPrivateKey: process.env.CELO_WITHDRAW_PRIVATE_KEY || '',
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
