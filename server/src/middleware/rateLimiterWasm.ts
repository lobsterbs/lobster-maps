/**
 * Rate Limiter Middleware (WASM version)
 * Token bucket algorithm via Rust/WASM
 * <1ms latency, 1000+ req/sec capacity
 */

import { Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../wasm/index.js';

// Per-IP rate limiters with timestamp for LRU/TTL cleanup
interface LimiterEntry {
  limiter: any;
  lastAccess: number;
}
const limiters = new Map<string, LimiterEntry>();
const MAX_LIMITERS = 5000;
const TTL_MS = 15 * 60 * 1000; // 15 minutes

// Periodic cleanup to eliminate memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of limiters.entries()) {
    if (now - entry.lastAccess > TTL_MS) {
      limiters.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

const CONFIG = {
  capacity: 100,        // tokens
  refillRatePerMs: 0.1, // 10 tokens/sec
  keyExtractor: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
};

/**
 * Get or create limiter for IP
 */
function getLimiter(key: string): any {
  const now = Date.now();
  let entry = limiters.get(key);
  if (!entry) {
    // If map exceeds capacity, purge oldest 10%
    if (limiters.size >= MAX_LIMITERS) {
      let count = 0;
      for (const k of limiters.keys()) {
        limiters.delete(k);
        if (++count > MAX_LIMITERS * 0.1) break;
      }
    }
    entry = {
      limiter: createRateLimiter(CONFIG.capacity, CONFIG.refillRatePerMs),
      lastAccess: now,
    };
    limiters.set(key, entry);
  } else {
    entry.lastAccess = now;
  }
  return entry.limiter;
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

  let allowed = true;
  let remaining = CONFIG.capacity;

  if (limiter) {
    if (typeof limiter.allow_request === 'function') {
      const res = limiter.allow_request();
      allowed = typeof res === 'boolean' ? res : Boolean(res & 0x80000000);
    } else if (typeof limiter.allowRequest === 'function') {
      allowed = Boolean(limiter.allowRequest());
    }

    if (typeof limiter.get_remaining === 'function') {
      remaining = limiter.get_remaining();
    } else if (typeof limiter.getRemaining === 'function') {
      remaining = limiter.getRemaining();
    }
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
