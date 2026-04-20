import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { normalizeError } from '../utils/logger.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  authMethod: 'google' | 'passkey' | 'admin';
  iat?: number;
  exp?: number;
}

export const tokenService = {
  generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload as object, config.jwt.secret as string, {
      expiresIn: config.jwt.expiry,
    } as jwt.SignOptions);
  },

  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', normalizeError(error));
      return null;
    }
  },

  parseAuthHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.slice(7);
  },
};
