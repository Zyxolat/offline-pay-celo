import { Response } from 'express';

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
