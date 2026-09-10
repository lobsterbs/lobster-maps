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
    console.log('🦀 Initializing WASM modules...');

    // Dynamic import (WASM loads at runtime)
    const wasmPkg = await import('../../routing-core/pkg/index.js');
    await wasmPkg.default();

    rateLimiter = wasmPkg.RateLimiter;
    searchScorer = wasmPkg.SearchScorer;
    weatherCache = wasmPkg.WeatherCache;

    console.log('✅ WASM modules ready');
    console.log('   - RateLimiter (<1ms, 1000+ req/sec)');
    console.log('   - SearchScorer (100x faster)');
    console.log('   - WeatherCache (O(1) lookups)');
  } catch (err) {
    console.error('❌ WASM init failed:', err);
    throw err;
  }
}

/**
 * Create RateLimiter instance (new per bucket)
 */
export function createRateLimiter(
  capacity: number,
  refillRatePerMs: number
): any {
  if (!rateLimiter) {
    throw new Error('WASM not initialized. Call initializeWasmModules() first.');
  }
  return new rateLimiter(capacity, refillRatePerMs);
}

/**
 * Get SearchScorer (static, reused)
 */
export function getSearchScorer(): any {
  if (!searchScorer) {
    throw new Error('WASM not initialized');
  }
  return searchScorer;
}

/**
 * Create WeatherCache instance (new for each region/time)
 */
export function createWeatherCache(): any {
  if (!weatherCache) {
    throw new Error('WASM not initialized');
  }
  return new weatherCache();
}

export default {
  initializeWasmModules,
  createRateLimiter,
  getSearchScorer,
  createWeatherCache,
};
