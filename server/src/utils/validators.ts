import { Response } from 'express';
import { z, ZodSchema } from 'zod';

export const successResponse = (res: Response, data: any, status: number = 200) => {
  res.status(status).json({
    success: true,
    data,
  });
};

export const errorResponse = (res: Response, message: string, status: number = 400, details?: any) => {
  res.status(status).json({
    success: false,
    error: message,
    ...(details && { details }),
  });
};

export const validateAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

export function validateWithSchema<T>(
  res: Response,
  schema: ZodSchema<T>,
  payload: unknown
): T | null {
  const result = schema.safeParse(payload);

  if (!result.success) {
    errorResponse(res, 'Invalid request input', 400, result.error.flatten());
    return null;
  }

  return result.data;
}

export const emailSchema = z.string().trim().email();
export const txHashSchema = z.string().trim().min(1);
export const uuidLikeSchema = z.string().trim().min(1);
