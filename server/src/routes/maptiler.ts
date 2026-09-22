/**
 * MapTiler API proxy
 *
 * The browser's Origin header is restricted and can cause "Key usage restricted"
 * errors from MapTiler. This proxy avoids that by having the server fetch on
 * behalf of the client, then serving it back.
 *
 * Usage:
 * - GET /api/maptiler/style/{mapId} → MapTiler's style.json
 * - GET /api/maptiler/tiles/{tilesId} → MapTiler's tiles.json
 * - GET /api/maptiler/fonts/{fontstack}/{range}.pbf → MapTiler's fonts
 */

import express from 'express';

const router = express.Router();
// MapTiler API key for server-side proxy
// Production: set VITE_MAPTILER_KEY in Render environment, or hardcode if env var unavailable
// Client: key is in client/.env.production and inlined at build time
// Note: Key is already committed to repo in .env.production, so hardcoding here is acceptable
// for now. Future: move to secure runtime env vars in Render.
const MAPTILER_KEY = process.env.VITE_MAPTILER_KEY || 'st6o11zRZ5rBnmLDbS6K';

/**
 * GET /api/maptiler/style/:mapId
 * Proxy MapTiler style.json to avoid browser Origin header issues
 */
router.get('/style/:mapId', async (req, res) => {
  const { mapId } = req.params;

  if (!MAPTILER_KEY) {
    res.status(400).json({ error: 'MapTiler API key not configured (VITE_MAPTILER_KEY)' });
    return;
  }

  // Sanitize map ID to prevent path traversal
  if (!/^[a-z0-9-]+$/.test(mapId)) {
    res.status(400).json({ error: 'Invalid map ID format' });
    return;
  }

  try {
    const url = `https://api.maptiler.com/maps/${mapId}/style.json?key=${MAPTILER_KEY}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LobsterMaps/1.0',
        'Referer': 'https://lobster-maps.onrender.com/',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(no body)');
      console.error(`MapTiler style.json failed:`, {
        status: response.status,
        url,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText.slice(0, 500),
      });
      res.status(response.status).json({ 
        error: `MapTiler API error: ${response.status}`,
        details: errorText.slice(0, 200),
      });
      return;
    }

    const data = await response.json();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
    res.json(data);
  } catch (error) {
    console.error('MapTiler proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch MapTiler style' });
  }
});

/**
 * GET /api/maptiler/tiles/:tilesId
 * Proxy MapTiler tiles.json (for terrain DEM, etc.)
 */
router.get('/tiles/:tilesId', async (req, res) => {
  const { tilesId } = req.params;

  if (!MAPTILER_KEY) {
    res.status(400).json({ error: 'MapTiler API key not configured (VITE_MAPTILER_KEY)' });
    return;
  }

  // Sanitize tiles ID
  if (!/^[a-z0-9-]+$/.test(tilesId)) {
    res.status(400).json({ error: 'Invalid tileset ID format' });
    return;
  }

  try {
    const url = `https://api.maptiler.com/tiles/${tilesId}/tiles.json?key=${MAPTILER_KEY}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LobsterMaps/1.0',
        'Referer': 'https://lobster-maps.onrender.com/',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(no body)');
      console.error(`MapTiler tiles.json failed:`, {
        status: response.status,
        url,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText.slice(0, 500),
      });
      res.status(response.status).json({ 
        error: `MapTiler API error: ${response.status}`,
        details: errorText.slice(0, 200),
      });
      return;
    }

    const data = await response.json();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24 hours
    res.json(data);
  } catch (error) {
    console.error('MapTiler proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch MapTiler tileset' });
  }
});

/**
 * GET /api/maptiler/fonts/:fontstack/:range.pbf
 * Proxy MapTiler font glyphs (binary PBF data)
 */
router.get('/fonts/:fontstack/:range', async (req, res) => {
  const { fontstack, range } = req.params;

  if (!MAPTILER_KEY) {
    res.status(400).json({ error: 'MapTiler API key not configured (VITE_MAPTILER_KEY)' });
    return;
  }

  // Sanitize fontstack and range
  if (!/^[a-zA-Z0-9\s,%]+$/.test(fontstack) || !/^\d+-\d+$/.test(range)) {
    res.status(400).json({ error: 'Invalid font parameters' });
    return;
  }

  try {
    const url = `https://api.maptiler.com/fonts/${encodeURIComponent(fontstack)}/${range}.pbf?key=${MAPTILER_KEY}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LobsterMaps/1.0',
        'Referer': 'https://lobster-maps.onrender.com/',
      },
    });

    if (!response.ok) {
      console.error(`MapTiler fonts failed:`, {
        status: response.status,
        url,
        fontstack,
        range,
      });
      res.status(response.status).send(null);
      return;
    }

    // Return binary PBF data as-is
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 year
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('MapTiler fonts proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch MapTiler fonts' });
  }
});

/**
 * GET /api/maptiler/health
 * Diagnostic endpoint: test MapTiler key without requiring a specific map ID
 * Returns: key status, response from MapTiler, and any error details
 */
router.get('/health', async (req, res) => {
  const testUrl = `https://api.maptiler.com/maps?key=${MAPTILER_KEY}`;
  
  try {
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'LobsterMaps/1.0',
        'Referer': 'https://lobster-maps.onrender.com/',
      },
    });

    const body = await response.text().catch(() => '(no body)');
    
    res.json({
      keyConfigured: !!MAPTILER_KEY,
      keyLength: MAPTILER_KEY.length,
      testUrl: `${testUrl.split('?')[0]}?key=***`,
      maptilerStatus: response.status,
      maptilerStatusText: response.statusText,
      maptilerHeaders: Object.fromEntries(response.headers.entries()),
      maptilerBody: body.slice(0, 500),
      success: response.ok,
    });
  } catch (error) {
    res.json({
      keyConfigured: !!MAPTILER_KEY,
      error: String(error),
    });
  }
});

export default router;
