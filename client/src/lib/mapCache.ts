/**
 * Map Cache - Offline/Persistent Map Data
 * Caches map tiles, routes, and POI data for fast return visits
 */

interface CacheEntry {
  data: string;
  timestamp: number;
  ttl: number;
}

const CACHE_DB = 'LobsterMaps_MapCache';
const MAP_TILES_STORE = 'mapTiles';
const ROUTES_STORE = 'routes';
const POIS_STORE = 'pois';

let db: IDBDatabase | null = null;

export async function initMapCache(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(MAP_TILES_STORE)) {
        database.createObjectStore(MAP_TILES_STORE);
      }
      if (!database.objectStoreNames.contains(ROUTES_STORE)) {
        database.createObjectStore(ROUTES_STORE);
      }
      if (!database.objectStoreNames.contains(POIS_STORE)) {
        database.createObjectStore(POIS_STORE);
      }
    };
  });
}

export async function cacheRoute(
  routeKey: string,
  routeData: Record<string, unknown>
): Promise<void> {
  if (!db) await initMapCache();

  const store = db!.transaction(ROUTES_STORE, 'readwrite').objectStore(
    ROUTES_STORE
  );

  const entry: CacheEntry = {
    data: JSON.stringify(routeData),
    timestamp: Date.now(),
    ttl: 7 * 24 * 3600 * 1000,
  };

  return new Promise((resolve, reject) => {
    const request = store.put(entry, routeKey);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedRoute(
  routeKey: string
): Promise<Record<string, unknown> | null> {
  if (!db) await initMapCache();

  const store = db!.transaction(ROUTES_STORE, 'readonly').objectStore(
    ROUTES_STORE
  );

  return new Promise((resolve, reject) => {
    const request = store.get(routeKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const entry = request.result as CacheEntry | undefined;
      if (!entry || Date.now() - entry.timestamp > entry.ttl) {
        if (entry) deleteRoute(routeKey);
        resolve(null);
        return;
      }
      resolve(JSON.parse(entry.data));
    };
  });
}

export async function cachePOIs(
  lat: number,
  lon: number,
  radius: number,
  pois: Record<string, unknown>[]
): Promise<void> {
  if (!db) await initMapCache();

  const store = db!.transaction(POIS_STORE, 'readwrite').objectStore(POIS_STORE);
  const key = `${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}`;

  const entry: CacheEntry = {
    data: JSON.stringify(pois),
    timestamp: Date.now(),
    ttl: 24 * 3600 * 1000,
  };

  return new Promise((resolve, reject) => {
    const request = store.put(entry, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedPOIs(
  lat: number,
  lon: number,
  radius: number
): Promise<Record<string, unknown>[] | null> {
  if (!db) await initMapCache();

  const store = db!.transaction(POIS_STORE, 'readonly').objectStore(POIS_STORE);
  const key = `${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}`;

  return new Promise((resolve, reject) => {
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const entry = request.result as CacheEntry | undefined;
      if (!entry || Date.now() - entry.timestamp > entry.ttl) {
        if (entry) deletePOIs(key);
        resolve(null);
        return;
      }
      resolve(JSON.parse(entry.data));
    };
  });
}

async function deleteRoute(key: string): Promise<void> {
  if (!db) return;
  const store = db.transaction(ROUTES_STORE, 'readwrite').objectStore(
    ROUTES_STORE
  );
  store.delete(key);
}

async function deletePOIs(key: string): Promise<void> {
  if (!db) return;
  const store = db.transaction(POIS_STORE, 'readwrite').objectStore(POIS_STORE);
  store.delete(key);
}

export async function getCacheStats(): Promise<{
  routes: number;
  pois: number;
}> {
  if (!db) await initMapCache();

  return new Promise((resolve) => {
    const routeStore = db!.transaction(ROUTES_STORE, 'readonly').objectStore(
      ROUTES_STORE
    );
    const poiStore = db!.transaction(POIS_STORE, 'readonly').objectStore(
      POIS_STORE
    );

    let routes = 0;
    let pois = 0;

    routeStore.count().onsuccess = (e) => (routes = (e.target as any).result);
    poiStore.count().onsuccess = (e) => {
      pois = (e.target as any).result;
      resolve({ routes, pois });
    };
  });
}

export async function clearMapCache(): Promise<void> {
  if (!db) await initMapCache();

  const stores = [ROUTES_STORE, POIS_STORE];
  for (const storeName of stores) {
    const store = db!.transaction(storeName, 'readwrite').objectStore(storeName);
    store.clear();
  }
}

export default {
  initMapCache,
  cacheRoute,
  getCachedRoute,
  cachePOIs,
  getCachedPOIs,
  getCacheStats,
  clearMapCache,
};
