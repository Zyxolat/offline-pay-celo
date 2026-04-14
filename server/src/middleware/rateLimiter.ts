import rateLimit from 'express-rate-limit';

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many failed attempts, please try again later.',
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 payments per minute
  message: 'Rate limit exceeded for payments.',
});
