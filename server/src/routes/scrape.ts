/**
 * Scraping API Endpoint
 * POST /api/scrape/region - Scrape businesses for a region
 */

import { Router, Request, Response } from 'express';
import { scrapeOSMBusinesses, storeScrapedBusinesses, scrapeTouristAttractions } from '../scripts/scrape-businesses.js';

const router = Router();

interface ScrapeRequest {
  city: string;
  country: string;
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

/**
 * POST /api/scrape/region
 * Scrape businesses for a specific region
 * Body: { city, country, minLat, minLon, maxLat, maxLon }
 */
router.post('/region', async (req: Request, res: Response) => {
  try {
    const { city, country, minLat, minLon, maxLat, maxLon } = req.body as ScrapeRequest;

    if (!city || !country || minLat === undefined || minLon === undefined || maxLat === undefined || maxLon === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`🔄 Scraping ${city}, ${country}...`);

    // Scrape OSM
    const osm = await scrapeOSMBusinesses(minLat, minLon, maxLat, maxLon);
    console.log(`Found ${osm.length} OSM businesses`);

    // Scrape tourist attractions
    const wiki = await scrapeTouristAttractions(city, country);
    console.log(`Found ${wiki.length} tourist attractions`);

    // Combine and store
    const all = [...osm, ...wiki];
    await storeScrapedBusinesses(all);

    res.json({
      success: true,
      city,
      country,
      osm_count: osm.length,
      attractions_count: wiki.length,
      total: all.length,
      message: `✅ Scraped and stored ${all.length} businesses`,
    });
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({
      error: 'Scraping failed',
      details: (err as Error).message,
    });
  }
});

/**
 * GET /api/scrape/status
 * Check scraping status
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'ready',
    sources: ['OpenStreetMap', 'Wikipedia', 'Google Maps'],
    message: 'POST to /api/scrape/region to scrape a new area',
  });
});

export default router;
