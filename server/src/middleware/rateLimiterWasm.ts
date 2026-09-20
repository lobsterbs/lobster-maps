/**
 * Per-IP token-bucket rate limiting (Rust/WASM when available, Node
 * fallback otherwise).
 *
 * This used to export a single middleware backed by one module-level
 * bucket map, mounted on all of `/api`. That was a real bug, not a
 * theoretical one: the map tile proxy lives under `/api/tiles/...`, and
 * one viewport of a slippy map fires 30-60 tile requests at once. With
 * a 100-token bucket refilling at 10/sec, a single pan drained the
 * bucket and the next genuine API call got a 429 — which looks exactly
 * like "the map is broken" from the browser.
 *
 * Fix: `createRateLimiterMiddleware` builds an isolated bucket map per
 * call, so tiles get their own generous bucket and the JSON API keeps
 * its strict one. They no longer compete.
 */

import { Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../wasm/index.js';

interface LimiterEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  limiter: any;
  lastAccess: number;
}

const MAX_LIMITERS = 5000;
const TTL_MS = 15 * 60 * 1000;

export type RateLimiterOptions = {
  /** Bucket size — the burst a single IP can spend at once. */
  capacity: number;
  /** Tokens added per millisecond. 0.1 === 10 tokens/second. */
  refillRatePerMs: number;
  /** Shown in logs and the 429 body so 429s are traceable to a bucket. */
  name: string;
};

export function createRateLimiterMiddleware(options: RateLimiterOptions) {
  const limiters = new Map<string, LimiterEntry>();

  // Evict idle buckets. .unref() so this timer never holds the process
  // open on shutdown.
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of limiters.entries()) {
      if (now - entry.lastAccess > TTL_MS) limiters.delete(ip);
    }
  }, 5 * 60 * 1000).unref();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getLimiter(key: string): any {
    const now = Date.now();
    let entry = limiters.get(key);
    if (!entry) {
      if (limiters.size >= MAX_LIMITERS) {
        let count = 0;
        for (const k of limiters.keys()) {
          limiters.delete(k);
          if (++count > MAX_LIMITERS * 0.1) break;
        }
      }
      entry = {
        limiter: createRateLimiter(options.capacity, options.refillRatePerMs),
        lastAccess: now,
      };
      limiters.set(key, entry);
    } else {
      entry.lastAccess = now;
    }
    return entry.limiter;
  }

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const limiter = getLimiter(key);

    let allowed = true;
    let remaining = options.capacity;

    if (limiter) {
      if (typeof limiter.allow_request === 'function') {
        const result = limiter.allow_request();
        allowed = typeof result === 'boolean' ? result : Boolean(result);
      } else if (typeof limiter.allowRequest === 'function') {
        allowed = Boolean(limiter.allowRequest());
      }

      if (typeof limiter.get_remaining === 'function') {
        remaining = limiter.get_remaining();
      } else if (typeof limiter.getRemaining === 'function') {
        remaining = limiter.getRemaining();
      }
    }

    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Limit', String(options.capacity));

    if (!allowed) {
      // Retry-After is a real HTTP header clients and crawlers honour;
      // the old code invented a JSON-only `retryAfter` field nothing
      // reads. Send both.
      const retryAfterSeconds = Math.max(1, Math.ceil(1 / (options.refillRatePerMs * 1000)));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        error: 'Too many requests',
        bucket: options.name,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

/**
 * JSON API bucket. Deliberately strict: these endpoints hit Postgres,
 * Nominatim and the routing engine.
 */
export const rateLimiterWasm = createRateLimiterMiddleware({
  name: 'api',
  capacity: 100,
  refillRatePerMs: 0.1, // 10 req/sec sustained
});

/**
 * Tile/asset bucket. Bursty by design — a slippy map requests dozens of
 * tiles per viewport — but still bounded so the proxy cannot be used as
 * free bandwidth.
 */
export const tileRateLimiter = createRateLimiterMiddleware({
  name: 'tiles',
  capacity: 400,
  refillRatePerMs: 0.2, // 200 req/sec sustained
});

export default rateLimiterWasm;
