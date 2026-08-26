import { Router } from 'express';
import { nominatimQueue } from '../middleware/rateLimiter.js';

const router = Router();

const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT || 'LobsterMaps/0.1 (set NOMINATIM_USER_AGENT in .env)';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// Forward geocode: address text -> candidate coordinates
router.get('/search', async (req, res) => {
  const q = req.query.q;
  if (typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'Missing query param "q"' });
  }

  try {
    const results = await nominatimQueue.enqueue(async () => {
      const url = new URL('/search', NOMINATIM_BASE);
      url.searchParams.set('q', q);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', '5');

      const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!resp.ok) throw new Error(`Nominatim responded ${resp.status}`);
      return resp.json();
    });

    res.json(results);
  } catch (err) {
    console.error('Geocode search failed:', err);
    res.status(502).json({ error: 'Geocoding service unavailable' });
  }
});

// Reverse geocode: coordinates -> address (used when someone drops a pin
// instead of searching)
router.get('/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (typeof lat !== 'string' || typeof lon !== 'string') {
    return res.status(400).json({ error: 'Missing lat/lon query params' });
  }

  try {
    const result = await nominatimQueue.enqueue(async () => {
      const url = new URL('/reverse', NOMINATIM_BASE);
      url.searchParams.set('lat', lat);
      url.searchParams.set('lon', lon);
      url.searchParams.set('format', 'jsonv2');

      const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!resp.ok) throw new Error(`Nominatim responded ${resp.status}`);
      return resp.json();
    });

    res.json(result);
  } catch (err) {
    console.error('Reverse geocode failed:', err);
    res.status(502).json({ error: 'Geocoding service unavailable' });
  }
});

export default router;
