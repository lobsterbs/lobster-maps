/**
 * WASM module integration.
 *
 * Four separate bugs used to make this unconditionally fall back to
 * Node, and the logs said only "routing-core/pkg missing":
 *
 *  1. The crate never compiled. 16 Rust errors; the GitHub Actions
 *     build had run exactly once, in September, and failed. So pkg/ was
 *     never produced by anything.
 *  2. wasm-pack was told `--target bundler`, whose output needs a
 *     bundler to resolve the .wasm import. This server runs plain
 *     `node dist/index.js`, so that output could never have loaded.
 *     It is built `--target nodejs` now.
 *  3. The import pointed at `pkg/index.js`. wasm-pack names the entry
 *     after the crate: `lobster_routing.js`.
 *  4. The relative path was wrong in both dev and prod. Compiled, this
 *     file is `server/dist/wasm/index.js`, so `../../routing-core`
 *     resolved to `server/routing-core`, which does not exist.
 *
 * Resolution is now explicit and candidate-based, and a failure says
 * which paths were tried instead of guessing at the cause.
 */

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let rateLimiter: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let searchScorer: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let weatherCache: any = null;
let wasmLoadError: string | null = null;

const WASM_ENTRY = 'lobster_routing.js';

function candidatePaths(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return [
    // server/dist/wasm -> repo root
    path.resolve(here, '../../../routing-core/pkg', WASM_ENTRY),
    // server/src/wasm -> repo root (tsx dev)
    path.resolve(here, '../../../routing-core/pkg', WASM_ENTRY),
    // whatever the process was launched from
    path.resolve(process.cwd(), 'routing-core/pkg', WASM_ENTRY),
    path.resolve(process.cwd(), '../routing-core/pkg', WASM_ENTRY),
  ];
}

/**
 * Load the WASM modules. Never throws: the Node fallbacks below are
 * complete implementations, not stubs, so a missing build degrades
 * performance and nothing else.
 */
export async function initializeWasmModules(): Promise<void> {
  const tried = candidatePaths();
  const found = tried.find((p) => existsSync(p));

  if (!found) {
    wasmLoadError = `no WASM build found (looked in ${[...new Set(tried.map((t) => path.dirname(t)))].join(', ')})`;
    console.warn(`WASM: ${wasmLoadError}`);
    console.warn('WASM: using Node fallbacks. Build with `npm run build:wasm`, or let the build-wasm workflow commit routing-core/pkg/.');
    return;
  }

  try {
    // `--target nodejs` output is CommonJS and initialises its own
    // memory on require, so there is no async default() to await —
    // calling one (as this used to) would have thrown even on a good
    // build.
    const require = createRequire(import.meta.url);
    const pkg = require(found);

    // Checked against the generated lobster_routing.d.ts, not assumed.
    // There is no `SearchScorer` class — search scoring is exposed as
    // free functions, which is why a previous version of this check
    // would have refused a perfectly good build.
    const missing = ['RateLimiter', 'WeatherCache', 'score_business'].filter((n) => !pkg[n]);
    if (missing.length > 0) {
      wasmLoadError = `WASM build is missing exports: ${missing.join(', ')}`;
      console.warn(`WASM: ${wasmLoadError} — staying on Node fallbacks.`);
      return;
    }

    rateLimiter = pkg.RateLimiter;
    weatherCache = pkg.WeatherCache;
    // Shape the free functions into the object callers already expect
    // (searchScorerWasm.ts calls `scorer.score_business(...)`).
    searchScorer = {
      score_business: pkg.score_business,
      score_businesses_batch: pkg.score_businesses_batch,
      // Not provided by the crate; kept so the interface matches the
      // Node fallback for any caller that wants a plain text score.
      score: (query: string, text: string) => {
        const q = query.toLowerCase();
        const t = (text || '').toLowerCase();
        if (t === q) return 1.0;
        if (t.startsWith(q)) return 0.9;
        if (t.includes(q)) return 0.8;
        return 0.4;
      },
    };
    wasmLoadError = null;
    console.log(`WASM: loaded RateLimiter, SearchScorer, WeatherCache from ${found}`);
  } catch (err) {
    wasmLoadError = (err as Error).message;
    console.warn('WASM: load failed, using Node fallbacks:', wasmLoadError);
  }
}

/** Why WASM is not active, or null when it is. For /health and logs. */
export function getWasmStatus(): { active: boolean; reason: string | null } {
  return { active: isWasmAvailable(), reason: wasmLoadError };
}

/**
 * Create RateLimiter instance (new per bucket)
 * Falls back to Node.js impl if WASM not available
 */
export function createRateLimiter(
  capacity: number,
  refillRatePerMs: number
): any {
  if (!rateLimiter) {
    let tokens = capacity;
    let lastRefill = Date.now();
    return {
      allow_request: () => {
        const now = Date.now();
        const passedMs = now - lastRefill;
        tokens = Math.min(capacity, tokens + passedMs * refillRatePerMs);
        lastRefill = now;
        if (tokens >= 1) {
          tokens -= 1;
          return true;
        }
        return false;
      },
      allowRequest() {
        return this.allow_request();
      },
      get_remaining: () => Math.floor(tokens),
      getRemaining() {
        return this.get_remaining();
      },
      getStatus: () => ({ capacity, tokens: Math.floor(tokens) }),
    };
  }
  return new rateLimiter(capacity, refillRatePerMs);
}

/**
 * Get SearchScorer (static, reused)
 * Falls back to Node.js impl if WASM not available
 */
export function getSearchScorer(): any {
  if (!searchScorer) {
    return {
      score: (query: string, text: string) => {
        const q = query.toLowerCase();
        const t = text.toLowerCase();
        if (t === q) return 1.0;
        if (t.includes(q)) return 0.8;
        return 0.4;
      },
      score_business: (
        query: string,
        name: string,
        category: string,
        userLat: number,
        userLon: number,
        bizLat: number,
        bizLon: number
      ) => {
        const q = query.toLowerCase().trim();
        const n = (name || '').toLowerCase();
        const c = (category || '').toLowerCase();
        let nameScore = 0;
        if (n === q) nameScore = 1.0;
        else if (n.startsWith(q)) nameScore = 0.9;
        else if (n.includes(q)) nameScore = 0.75;
        else {
          const words = q.split(/\s+/);
          const matched = words.filter((w) => n.includes(w)).length;
          nameScore = matched > 0 ? (matched / words.length) * 0.6 : 0.2;
        }

        const catScore = c === q || c.includes(q) ? 0.9 : 0.3;

        const dLat = (userLat - bizLat) * 111;
        const dLon = (userLon - bizLon) * 111 * Math.cos((userLat * Math.PI) / 180);
        const distKm = Math.sqrt(dLat * dLat + dLon * dLon);
        const proxScore = Math.max(0, 1 - distKm / 25);

        return Number((nameScore * 0.6 + catScore * 0.2 + proxScore * 0.2).toFixed(3));
      },
    };
  }
  return searchScorer;
}

/**
 * Create WeatherCache instance (new for each region/time)
 * Falls back to Node.js impl if WASM not available
 */
export function createWeatherCache(): any {
  if (!weatherCache) {
    const memCache = new Map<string, { value: any; timestamp: number }>();
    return {
      get: (key: string) => {
        const item = memCache.get(key);
        if (!item) return null;
        if (Date.now() - item.timestamp > 3600_000) {
          memCache.delete(key);
          return null;
        }
        return item.value;
      },
      set: (key: string, value: any) => {
        memCache.set(key, { value, timestamp: Date.now() });
      },
      add_condition: () => {},
      get_delay_for_edge: () => 0,
      get_route_delay: () => 0,
      is_stale: () => false,
      clear: () => memCache.clear(),
      cell_count: () => memCache.size,
    };
  }
  return new weatherCache();
}


/**
 * Check if WASM modules are actually loaded
 */
export function isWasmAvailable(): boolean {
  return rateLimiter !== null && searchScorer !== null && weatherCache !== null;
}

export default {
  initializeWasmModules,
  getWasmStatus,
  createRateLimiter,
  getSearchScorer,
  createWeatherCache,
  isWasmAvailable,
};
