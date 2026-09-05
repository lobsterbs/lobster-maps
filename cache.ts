// Route caching: Avoid recalculating same routes
// Health monitoring: Track system status

export interface CachedRoute {
  from: [number, number];
  to: [number, number];
  result: any; // RouteResult
  cached_at: number;
  ttl: number; // milliseconds
}

export interface HealthStatus {
  ok: boolean;
  graphLoaded: boolean;
  nvdbResponding: boolean;
  weatherResponding: boolean;
  cacheSize: number;
  uptime: number; // seconds
  errors: { type: string; count: number }[];
}

export class RouteCache {
  private cache: Map<string, CachedRoute> = new Map();
  private maxSize = 1000;
  private defaultTTL = 3600000; // 1 hour

  private hashKey(from: [number, number], to: [number, number]): string {
    // Round to 3 decimals (≈100m precision)
    return `${from[0].toFixed(3)},${from[1].toFixed(3)}:${to[0].toFixed(3)},${to[1].toFixed(3)}`;
  }

  set(from: [number, number], to: [number, number], result: any, ttl?: number) {
    const key = this.hashKey(from, to);

    this.cache.set(key, {
      from,
      to,
      result,
      cached_at: Date.now(),
      ttl: ttl || this.defaultTTL,
    });

    // Cleanup if over size
    if (this.cache.size > this.maxSize) {
      const entriesToDelete = Math.ceil(this.maxSize * 0.1);
      let deleted = 0;

      for (const [k, v] of this.cache) {
        if (Date.now() - v.cached_at > v.ttl) {
          this.cache.delete(k);
          deleted++;
          if (deleted >= entriesToDelete) break;
        }
      }
    }
  }

  get(from: [number, number], to: [number, number]): any | null {
    const key = this.hashKey(from, to);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.cached_at > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  clear() {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Manual cleanup of expired entries
  prune() {
    let removed = 0;
    for (const [k, v] of this.cache) {
      if (Date.now() - v.cached_at > v.ttl) {
        this.cache.delete(k);
        removed++;
      }
    }
    return removed;
  }
}

export class HealthMonitor {
  private startTime = Date.now();
  private errors: Map<string, number> = new Map();
  private lastGraphCheck = 0;
  private lastNVDBCheck = 0;
  private lastWeatherCheck = 0;

  recordError(type: string) {
    this.errors.set(type, (this.errors.get(type) || 0) + 1);
  }

  getStatus(
    graphLoaded: boolean,
    nvdbWorking: boolean,
    weatherWorking: boolean,
    cacheSize: number
  ): HealthStatus {
    const uptime = (Date.now() - this.startTime) / 1000;
    const errorArray = Array.from(this.errors.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    return {
      ok: graphLoaded && (nvdbWorking || uptime > 60), // NVDB optional if just started
      graphLoaded,
      nvdbResponding: nvdbWorking,
      weatherResponding: weatherWorking,
      cacheSize,
      uptime,
      errors: errorArray,
    };
  }

  checkGraphStatus(loadedSuccessfully: boolean) {
    this.lastGraphCheck = Date.now();
    if (!loadedSuccessfully) this.recordError('graph_load_failed');
  }

  checkNVDBStatus(working: boolean) {
    this.lastNVDBCheck = Date.now();
    if (!working) this.recordError('nvdb_unavailable');
  }

  checkWeatherStatus(working: boolean) {
    this.lastWeatherCheck = Date.now();
    if (!working) this.recordError('weather_unavailable');
  }
}

export const routeCache = new RouteCache();
export const healthMonitor = new HealthMonitor();
