/**
 * WASM Module Integration
 * Lazy-loads and exposes Rust/WASM modules for Express
 */

let rateLimiter: any = null;
let searchScorer: any = null;
let weatherCache: any = null;

/**
 * Initialize all WASM modules on server startup
 */
export async function initializeWasmModules(): Promise<void> {
  try {
    // Try to load WASM (optional on Render without Rust toolchain)
    let wasmPkg: any = null;
    try {
      // @ts-expect-error - Module may not exist at build time on Render
      wasmPkg = await import('../../routing-core/pkg/index.js');
    } catch (importErr: any) {
      // This is expected on Render - just log and continue with fallbacks
      console.warn('⚠️ WASM modules not found (routing-core/pkg missing)');
      console.warn('   Using Node.js fallbacks for all operations.');
      return;
    }

    if (wasmPkg && wasmPkg.default) {
      await wasmPkg.default();

      rateLimiter = wasmPkg.RateLimiter;
      searchScorer = wasmPkg.SearchScorer;
      weatherCache = wasmPkg.WeatherCache;

      console.log('✅ WASM modules loaded');
      console.log('   - RateLimiter (<1ms, 1000+ req/sec)');
      console.log('   - SearchScorer (100x faster)');
      console.log('   - WeatherCache (O(1) lookups)');
    }
  } catch (err) {
    console.warn('⚠️ WASM initialization failed (will use Node.js fallbacks)');
    console.warn('   Error:', (err as Error).message);
    // Don't throw - let server continue with Node.js implementations
  }
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


export default {
  initializeWasmModules,
  createRateLimiter,
  getSearchScorer,
  createWeatherCache,
};
