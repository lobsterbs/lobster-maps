/**
 * Lazy-load businesses only when map is zoomed in
 * and user has stopped panning (debounced)
 */

export interface LazyLoadOptions {
  minZoom: number;
  debounceMs: number;
  onLoad: (businesses: any[]) => void;
}

export function setupLazyLoading(
  map: any,
  { minZoom = 15, debounceMs = 500, onLoad }: LazyLoadOptions
) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const cache = new Map<string, any[]>();

  const loadBusinesses = async () => {
    const zoom = map.getZoom();
    if (zoom < minZoom) {
      onLoad([]);
      return;
    }

    const bounds = map.getBounds();
    const key = `${bounds._sw.lat.toFixed(4)},${bounds._sw.lng.toFixed(4)},${bounds._ne.lat.toFixed(4)},${bounds._ne.lng.toFixed(4)}`;

    if (cache.has(key)) {
      onLoad(cache.get(key) || []);
      return;
    }

    try {
      const bbox = [bounds._sw.lng, bounds._sw.lat, bounds._ne.lng, bounds._ne.lat];
      const response = await fetch(
        `/api/businesses?bbox=${bbox.join(',')}`
      );
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      const businesses = data.businesses || [];
      cache.set(key, businesses);
      onLoad(businesses);
    } catch (err) {
      console.error('Lazy load failed:', err);
      onLoad([]);
    }
  };

  const handleMove = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadBusinesses, debounceMs);
  };

  const handleZoom = () => {
    handleMove();
  };

  map.on('move', handleMove);
  map.on('zoom', handleZoom);

  // Initial load
  loadBusinesses();

  return () => {
    map.off('move', handleMove);
    map.off('zoom', handleZoom);
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}
