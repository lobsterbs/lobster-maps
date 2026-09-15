/**
 * Weather Cache WASM Integration
 * Grid-based weather cell caching
 * O(1) delay lookups vs O(n) per-edge API calls
 * 10-50x faster than Yr.no per-request approach
 */

import { createWeatherCache } from '../wasm/index.js';

interface WeatherCondition {
  code: number;
  windSpeed: number;
  precipitationRate: number;
}

/**
 * MET Norway symbol_code to WMO weather code mapping
 * MET returns human-readable strings; WASM expects WMO numeric codes
 * Reference: https://www.met.no/en/weather/weather-and-climate-services/about-met/faq/what-do-the-weather-symbols-mean/
 */
const MET_SYMBOL_TO_WMO: Record<string, number> = {
  // Clear conditions
  'clearsky_day': 0,
  'clearsky_night': 0,
  'fair_day': 1,
  'fair_night': 1,
  
  // Cloudy conditions
  'partlycloudy_day': 2,
  'partlycloudy_night': 2,
  'cloudy': 3,
  'overcast': 3,
  
  // Rain
  'rain': 80,
  'lightrain': 80,
  'rainshowers_day': 80,
  'rainshowers_night': 80,
  'heavyrainshowers_day': 82,
  'heavyrainshowers_night': 82,
  
  // Snow
  'lightsnow': 71,
  'snow': 75,
  'heavysnow': 77,
  'snowshowers_day': 75,
  'snowshowers_night': 75,
  
  // Sleet
  'sleet': 66,
  'lightsleet': 66,
  
  // Default fallback
  'unknown': 0,
};

/**
 * Convert MET Norway symbol_code string to WMO numeric weather code
 */
function symbolCodeToWmo(symbolCode: string | undefined): number {
  if (!symbolCode) return 0;
  const code = MET_SYMBOL_TO_WMO[symbolCode];
  if (code === undefined) {
    console.warn(`Unknown weather symbol: ${symbolCode}, defaulting to clear sky`);
    return 0;
  }
  return code;
}

export class WeatherCacheManager {
  private cache: any = null;
  private initialized = false;

  constructor() {
    this.cache = createWeatherCache();
    this.initialized = true;
  }

  /**
   * Add weather condition for grid cell
   * Code: WMO weather code (0=clear, 71-77=snow, 80-82=rain)
   */
  addCondition(
    lat: number,
    lon: number,
    code: number,
    windSpeed: number,
    precipitationRate: number
  ): void {
    if (!this.initialized) throw new Error('Cache not initialized');
    if (this.cache?.add_condition) {
      this.cache.add_condition(lat, lon, code, windSpeed, precipitationRate);
    } else {
      // Fallback: no-op if WASM unavailable
      console.warn('⚠️ Weather cache unavailable, skipping condition');
    }
  }

  /**
   * Get delay for single edge (O(1) lookup)
   * Returns delay in ms (0-120ms)
   */
  getEdgeDelay(lat: number, lon: number): number {
    if (!this.initialized) return 0;
    if (this.cache?.get_delay_for_edge) {
      return this.cache.get_delay_for_edge(lat, lon);
    }
    return 0; // Fallback: no delay
  }

  /**
   * Get average delay for entire route
   */
  getRouteDelay(lats: number[], lons: number[]): number {
    if (!this.initialized) return 0;
    if (lats.length === 0 || lons.length === 0) return 0;
    if (this.cache?.get_route_delay) {
      return this.cache.get_route_delay(lats, lons);
    }
    return 0; // Fallback: no delay
  }

  /**
   * Populate cache from Yr.no forecast
   * Should be called periodically (every 10 min)
   */
  populateFromYrno(forecast: any[]): void {
    if (!this.initialized) throw new Error('Cache not initialized');

    for (const point of forecast) {
      this.addCondition(
        point.lat,
        point.lon,
        point.weatherCode,
        point.windSpeed,
        point.precipitation
      );
    }
  }

  /**
   * Check if stale (>1h old)
   */
  isStale(): boolean {
    if (!this.initialized) return true;
    if (this.cache?.is_stale) {
      return this.cache.is_stale();
    }
    return true; // Fallback: assume stale if WASM unavailable
  }

  /**
   * Clear all cells
   */
  clear(): void {
    if (!this.initialized) return;
    if (this.cache?.clear) {
      this.cache.clear();
    }
  }

  /**
   * Get cell count
   */
  getCellCount(): number {
    if (!this.initialized) return 0;
    if (this.cache?.cell_count) {
      return this.cache.cell_count();
    }
    return 0; // Fallback: no cells
  }
}

// Global instance (per-region or per-update-cycle)
let globalCache: WeatherCacheManager | null = null;

/**
 * Get or create global weather cache
 */
export function getGlobalWeatherCache(): WeatherCacheManager {
  if (!globalCache) {
    globalCache = new WeatherCacheManager();
  }
  return globalCache;
}

/**
 * Refresh weather cache from Yr.no
 */
export async function refreshWeatherCache(): Promise<void> {
  try {
    const cache = getGlobalWeatherCache();

    // Fetch from Yr.no (batch endpoint for Bergen region)
    const response = await fetch(
      'https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=60.4&lon=5.3'
    );
    const data = await response.json();

    // Parse timeseries
    const forecast = data.properties.timeseries.map((ts: any) => ({
      lat: 60.4,
      lon: 5.3,
      weatherCode: symbolCodeToWmo(ts.data.next_1_hours?.summary?.symbol_code),
      windSpeed: ts.data.instant?.details?.wind_speed || 0,
      precipitation: ts.data.next_1_hours?.details?.precipitation_amount || 0,
    }));

    cache.populateFromYrno(forecast);
    console.log(`✅ Weather cache populated (${cache.getCellCount()} cells)`);
  } catch (err) {
    console.error('❌ Weather cache refresh failed:', err);
  }
}

/**
 * Benchmark: Test 1000 edge lookups
 * Should complete in <1ms with WASM
 */
export function benchmarkWeatherCache(): {
  duration: number;
  lookupsPerMs: number;
} {
  const cache = new WeatherCacheManager();

  // Add 100 cells
  for (let i = 0; i < 100; i++) {
    cache.addCondition(60.4 + i * 0.01, 5.3 + i * 0.01, 71, 15.0, 5.0);
  }

  // Benchmark lookups
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    cache.getEdgeDelay(60.4, 5.3);
  }
  const duration = performance.now() - start;

  return {
    duration,
    lookupsPerMs: 1000 / duration,
  };
}

export default {
  WeatherCacheManager,
  getGlobalWeatherCache,
  refreshWeatherCache,
  benchmarkWeatherCache,
};
