/**
 * Directions API
 * Returns both car routing + public transit options
 */

import { Router, Request, Response } from 'express';
import { getRealRoute } from '../lib/realRouting.js';
import { getRealTransit } from '../lib/realTransit.js';

const router = Router();

/**
 * POST /directions
 * Get car route + transit options
 * Body: { fromLat, fromLng, toLat, toLng, mode?, departTime? }
 * mode: 'car' | 'transit' | 'both' (default: both)
 */
router.post('/directions', async (req: Request, res: Response) => {
  try {
    const { fromLat, fromLng, toLat, toLng, mode = 'both', departTime } = req.body;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }

    const result: any = { mode };

    // Get car routing
    if (mode === 'car' || mode === 'both') {
      const carRoute = await getRealRoute(fromLat, fromLng, toLat, toLng);
      if (carRoute) {
        result.car = carRoute;
      }
    }

    // Get transit options
    if (mode === 'transit' || mode === 'both') {
      const transit = await getRealTransit(fromLat, fromLng, toLat, toLng, departTime);
      if (transit) {
        result.transit = transit;
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Directions error:', err);
    res.status(500).json({ error: 'Failed to get directions' });
  }
});

export default router;
