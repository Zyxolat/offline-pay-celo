import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/tokenService.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: 'admin' | 'user';
    authMethod: 'google' | 'passkey' | 'admin';
    isAdmin?: boolean;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = tokenService.parseAuthHeader(authHeader);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const payload = tokenService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    authMethod: payload.authMethod,
    isAdmin: payload.role === 'admin',
  };

  next();
};
