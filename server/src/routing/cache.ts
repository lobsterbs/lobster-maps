/**
 * Route Cache Manager - Redis
 * Configurable TTLs per cache type
 */

import { createClient, RedisClientType } from 'redis';

export interface CacheConfig {
  routeTTL: number; // seconds
  searchTTL: number;
  businessTTL: number;
  weatherTTL: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  routeTTL: 7 * 24 * 3600, // 7 days
  searchTTL: 24 * 3600, // 1 day
  businessTTL: 30 * 24 * 3600, // 30 days
  weatherTTL: 3600, // 1 hour
};

let redisClient: RedisClientType | null = null;
let cacheConfig: CacheConfig = DEFAULT_CONFIG;

export async function initCache(config: Partial<CacheConfig> = {}) {
  cacheConfig = { ...DEFAULT_CONFIG, ...config };

  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  await redisClient.connect();
}

export async function cacheRoute(
  key: string,
  value: string,
  ttl: 'route' | 'search' | 'business' = 'route'
): Promise<void> {
  if (!redisClient) return;

  const ttlSeconds = cacheConfig[`${ttl}TTL`];
  await redisClient.setEx(key, ttlSeconds, value);
}

export async function getCache(key: string): Promise<string | null> {
  if (!redisClient) return null;
  return await redisClient.get(key);
}

export async function deleteCache(key: string): Promise<void> {
  if (!redisClient) return;
  await redisClient.del(key);
}

export function getCacheConfig(): CacheConfig {
  return cacheConfig;
}

export default { initCache, cacheRoute, getCache, deleteCache };

// Additional exports for compatibility
export const routeCache = {
  get: getCache,
  set: cacheRoute,
  delete: deleteCache,
  getConfig: getCacheConfig,
  size: 0, // Placeholder
};

export const healthMonitor = {
  checkGraphStatus: (loaded: boolean) => {
    console.log(`Graph status: ${loaded ? 'loaded' : 'not loaded'}`);
  },
  checkWeatherStatus: (available: boolean) => {
    console.log(`Weather status: ${available ? 'available' : 'unavailable'}`);
  },
  recordError: (errorType: string) => {
    console.error(`Health check error: ${errorType}`);
  },
  getStatus: () => ({
    graph: 'loaded',
    weather: 'available',
    nvdb: 'available',
  }),
  getHealth: () => ({
    redis: redisClient ? 'connected' : 'disconnected',
    graph: 'unknown',
    weather: 'unknown',
  }),
};
