/**
 * Search API Route
 * Combines geocoding + search scorer WASM for fast results
 */

import { Router, Request, Response } from 'express';
import { geocode } from '../lib/geocoding.js';
import { searchBusinessesWasm } from '../lib/searchScorerWasm.js';
import { fetchBusinessesInView } from '../lib/api.js'; // Assuming exists

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

    console.log(`🔍 Search: "${q}"`);

    // Step 1: Geocode query
    const geocoded = await geocode(q).catch((err) => {
      console.error('Geocoding failed:', err);
      return null;
    });

    if (!geocoded) {
      res.json({ results: [], message: 'No results found' });
      return;
    }

    const userLat = lat || geocoded.lat;
    const userLon = lon || geocoded.lon;

    const results: any[] = [geocoded];

    // Step 2: Search businesses if requested
    if (type === 'business' || type === 'all') {
      try {
        const bounds: [number, number, number, number] = [
          userLon - radius / 111,
          userLat - radius / 111,
          userLon + radius / 111,
          userLat + radius / 111,
        ];

        const businesses = await fetchBusinessesInView(bounds).catch(() => []);
        console.log(`Found ${businesses.length} businesses`);

        // Score with WASM if available
        if (searchBusinessesWasm) {
          const scored = searchBusinessesWasm(q, businesses, userLat, userLon, 10);
          results.push(...scored);
        }
      } catch (err) {
        console.error('Business search failed:', err);
      }
    }

    res.json({
      results,
      center: { lat: userLat, lon: userLon },
      count: results.length,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed', details: String(err) });
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
