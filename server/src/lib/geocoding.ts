/**
 * Geocoding Service
 * Converts addresses/place names to lat/lon coordinates
 * Supports Nominatim (OSM) + local cache
 */

interface GeocodeResult {
  lat: number;
  lon: number;
  name: string;
  type: 'address' | 'place' | 'business';
  address?: string;
}

const CACHE = new Map<string, GeocodeResult>();

/**
 * Geocode using Nominatim (OpenStreetMap)
 * Free, no auth required
 * Rate limit: 1 req/sec per IP
 */
export async function geocodeNominatim(
  query: string
): Promise<GeocodeResult | null> {
  const cached = CACHE.get(query.toLowerCase());
  if (cached) return cached;

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('countrycodes', 'no'); // Limit to Norway
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'LobsterMaps/1.0 (privacy-first maps)',
      },
    });

    if (!response.ok) {
      console.error('Nominatim error:', response.status);
      return null;
    }

    const results = await response.json();
    if (results.length === 0) return null;

    const result = results[0];
    const geocoded: GeocodeResult = {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      name: result.name || query,
      type: result.type === 'house' ? 'address' : 'place',
      address: result.address || result.display_name,
    };

    // Cache for 7 days
    CACHE.set(query.toLowerCase(), geocoded);
    return geocoded;
  } catch (err) {
    console.error('Nominatim geocoding failed:', err);
    return null;
  }
}

/**
 * Local Bergen POI database (hardcoded for fast access)
 */
const BERGEN_POIS: Record<string, GeocodeResult> = {
  'bryggen': {
    lat: 60.3653,
    lon: 5.3244,
    name: 'Bryggen',
    type: 'place',
  },
  'fløyen': {
    lat: 60.3663,
    lon: 5.3567,
    name: 'Fløyen',
    type: 'place',
  },
  'askøy bridge': {
    lat: 60.5167,
    lon: 5.2167,
    name: 'Askøy Bridge',
    type: 'place',
  },
  'hardangerfjord': {
    lat: 60.4,
    lon: 6.5,
    name: 'Hardangerfjord',
    type: 'place',
  },
  'geirangerfjord': {
    lat: 62.1,
    lon: 7.2,
    name: 'Geirangerfjord',
    type: 'place',
  },
};

/**
 * Geocode with local cache first, then Nominatim
 */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const normalized = query.toLowerCase().trim();

  // Check local cache
  if (CACHE.has(normalized)) {
    return CACHE.get(normalized) || null;
  }

  // Check Bergen POIs
  if (BERGEN_POIS[normalized]) {
    CACHE.set(normalized, BERGEN_POIS[normalized]);
    return BERGEN_POIS[normalized];
  }

  // Nominatim (with rate limiting awareness)
  return geocodeNominatim(query);
}

/**
 * Geocode multiple queries in batch
 * Use caution with Nominatim rate limits
 */
export async function geocodeBatch(
  queries: string[]
): Promise<(GeocodeResult | null)[]> {
  return Promise.all(queries.map((q) => geocode(q)));
}

/**
 * Get cache stats
 */
export function getCacheStats(): {
  entries: number;
  size: string;
} {
  const size = CACHE.size * 200; // Rough estimate: 200 bytes per entry
  return {
    entries: CACHE.size,
    size: size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`,
  };
}

/**
 * Clear geocoding cache
 */
export function clearGeocodeCache(): void {
  CACHE.clear();
}

export default {
  geocode,
  geocodeBatch,
  geocodeNominatim,
  getCacheStats,
  clearGeocodeCache,
};
