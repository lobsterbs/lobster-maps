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
