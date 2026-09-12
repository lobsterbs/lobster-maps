/**
 * Rate Limiter Middleware (WASM version)
 * Token bucket algorithm via Rust/WASM
 * <1ms latency, 1000+ req/sec capacity
 */

import { Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../wasm/index.js';

// Per-IP rate limiters
const limiters = new Map<string, any>();

const CONFIG = {
  capacity: 100,        // tokens
  refillRatePerMs: 0.1, // 10 tokens/sec
  keyExtractor: (req: Request) => req.ip || 'unknown',
};

/**
 * Get or create limiter for IP
 */
function getLimiter(key: string): any {
  if (!limiters.has(key)) {
    limiters.set(key, createRateLimiter(CONFIG.capacity, CONFIG.refillRatePerMs));
  }
  return limiters.get(key);
}

/**
 * Express middleware
 */
export const rateLimiterWasm = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const key = CONFIG.keyExtractor(req);
  const limiter = getLimiter(key);

  // Check if allowed (WASM, <1ms)
  let allowed = true;
  let remaining = CONFIG.capacity;

  if (limiter?.allow_request && typeof limiter.allow_request === 'function') {
    allowed = limiter.allow_request();
    if (limiter?.get_remaining && typeof limiter.get_remaining === 'function') {
      remaining = limiter.get_remaining();
    }
  } else {
    // Fallback: always allow if WASM unavailable
    console.warn('⚠️ Rate limiter unavailable, allowing all requests');
    allowed = true;
  }

  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Limit', CONFIG.capacity);

  if (!allowed) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: 1,
    });
    return;
  }

  next();
};

/**
 * Configure rate limiter (optional)
 */
export function configureRateLimiter(options: {
  capacity?: number;
  refillRatePerMs?: number;
}): void {
  if (options.capacity !== undefined) {
    CONFIG.capacity = options.capacity;
  }
  if (options.refillRatePerMs !== undefined) {
    CONFIG.refillRatePerMs = options.refillRatePerMs;
  }
  // Clear existing limiters to apply new config
  limiters.clear();
}

/**
 * Get stats (for monitoring)
 */
export function getRateLimiterStats(): {
  activeLimiters: number;
  capacity: number;
  refillRate: number;
} {
  return {
    activeLimiters: limiters.size,
    capacity: CONFIG.capacity,
    refillRate: CONFIG.refillRatePerMs * 1000, // tokens/sec
  };
}

export default rateLimiterWasm;
