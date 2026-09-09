/**
 * Rate Limiter Middleware
 * Token bucket algorithm for API rate limiting
 * Default: 100 requests per 60 seconds
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    tokens: number;
    lastRefill: number;
  };
}

const store: RateLimitStore = {};
const CAPACITY = 100;
const REFILL_RATE = 100 / 60; // tokens per second
const WINDOW = 60 * 1000; // 60 seconds in ms

export const rateLimiter = (
  capacity = CAPACITY,
  refillRate = REFILL_RATE
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || 'unknown';
    const now = Date.now();

    // Initialize or get bucket
    if (!store[clientIp]) {
      store[clientIp] = { tokens: capacity, lastRefill: now };
    }

    const bucket = store[clientIp];

    // Refill tokens
    const timePassed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      capacity,
      bucket.tokens + timePassed * refillRate
    );
    bucket.lastRefill = now;

    // Check if allowed
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens));
      next();
    } else {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(1 / refillRate),
      });
    }

    // Cleanup old entries
    if (Math.random() < 0.01) {
      Object.keys(store).forEach((key) => {
        if (now - store[key].lastRefill > WINDOW * 2) {
          delete store[key];
        }
      });
    }
  };
};

export default rateLimiter;
