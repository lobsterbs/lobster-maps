/**
 * Search API Route
 * Combines geocoding + search scorer WASM for fast results
 */

import { Router, Request, Response } from 'express';
import { geocode } from '../lib/geocoding.js';
import { searchBusinessesWasm } from '../lib/searchScorerWasm.js';
import { fetchBusinessesInView } from '../lib/api.js'; // Assuming exists
import { searchLandmarks } from '../lib/landmarkSearch.js';

const router = Router();

interface SearchQuery {
  q: string;
  lat?: number;
  lon?: number;
  radius?: number;
  type?: 'place' | 'business' | 'all';
}

/**
 * Search endpoint
 * POST /api/search
 * Body: { q, lat?, lon?, radius?, type? }
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { q, lat, lon, radius = 5, type = 'all' } = req.body as SearchQuery;

    if (!q || q.trim().length === 0) {
      res.status(400).json({ error: 'Query required' });
      return;
    }

    // Validate numeric parameters
    const parsedLat = lat ? Number(lat) : undefined;
    const parsedLon = lon ? Number(lon) : undefined;
    const parsedRadius = Number(radius);

    if ((parsedLat !== undefined && (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90)) ||
        (parsedLon !== undefined && (isNaN(parsedLon) || parsedLon < -180 || parsedLon > 180)) ||
        isNaN(parsedRadius) || parsedRadius <= 0) {
      res.status(400).json({ error: 'Invalid lat/lon/radius parameters' });
      return;
    }

    console.log(`🔍 Search: "${q}"`);

    // Step 1: Try geocoding query
    const geocoded = await geocode(q).catch((err) => {
      console.warn('Geocoding warning:', err);
      return null;
    });

    const userLat = parsedLat || (geocoded ? geocoded.lat : 60.3913);
    const userLon = parsedLon || (geocoded ? geocoded.lon : 5.3221);
    
    // Convert km radius to degrees, accounting for latitude (111km per degree at equator)
    // At Bergen (60°N), use cos(lat) to get more accurate bbox
    const latRadians = (userLat * Math.PI) / 180;
    const lngPerDegree = 111 * Math.cos(latRadians);
    const latPerDegree = 111;
    
    const searchRadiusDeg = {
      lat: parsedRadius / latPerDegree,
      lng: parsedRadius / lngPerDegree,
    };

    const results: any[] = [];
    if (geocoded) {
      results.push(geocoded);
    }

    // Step 1.5: Search global landmarks
    const landmarks = searchLandmarks(q);
    if (landmarks.length > 0) {
      console.log(`Found ${landmarks.length} landmarks`);
      results.push(
        ...landmarks.map((l) => ({
          id: l.id,
          name: l.name,
          lat: l.lat,
          lon: l.lon,
          address: l.city,
          category: l.category,
          type: 'landmark',
        }))
      );
    }

    // Step 2: Search businesses if requested
    if (type === 'business' || type === 'all') {
      try {
        const bounds: [number, number, number, number] = [
          userLon - searchRadiusDeg.lng,
          userLat - searchRadiusDeg.lat,
          userLon + searchRadiusDeg.lng,
          userLat + searchRadiusDeg.lat,
        ];

        const businesses = await fetchBusinessesInView(bounds).catch((err) => {
          console.warn('Business view query warning:', err);
          return [];
        });

        if (businesses.length > 0) {
          const scored = searchBusinessesWasm(q, businesses, userLat, userLon, 10);
          results.push(...(scored.length > 0 ? scored : businesses.slice(0, 10)));
        }
      } catch (err) {
        console.warn('Business search error:', err);
      }
    }

    res.json({
      results,
      center: { lat: userLat, lon: userLon },
      count: results.length,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ 
      error: 'Search failed', 
      details: (err as Error).message,
      results: [],
    });
  }
});

/**
 * Geocode-only endpoint
 * GET /api/geocode?q=query
 */
router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      res.status(400).json({ error: 'Query required' });
      return;
    }

    const result = await geocode(q);
    if (!result) {
      res.json({ result: null, message: 'Not found' });
      return;
    }

    res.json({ result });
  } catch (err) {
    console.error('Geocode error:', err);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

export default router;
