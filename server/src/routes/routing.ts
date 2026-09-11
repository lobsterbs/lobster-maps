/**
 * Routing API Route
 * Calculates routes with traffic and weather data
 */

import { Router, Request, Response } from 'express';
import { Router as RoutingEngine } from '../routing/router.js';
import { weatherClient } from '../routing/weatherClient.js';
import { routeCache, healthMonitor } from '../routing/cache.js';

const router = Router();
const routingEngine = new RoutingEngine();

/**
 * POST /route
 * Calculate route between two points
 */
router.post('/route', async (req: Request, res: Response) => {
  try {
    const { from, to, departureTime } = req.body;

    if (!from || !to || !from.lat || !from.lon || !to.lat || !to.lon) {
      return res.status(400).json({
        error: 'Missing or invalid coordinates',
        required: { 
          from: { lat: 'number', lon: 'number' }, 
          to: { lat: 'number', lon: 'number' } 
        },
      });
    }

    const { lat: fromLat, lon: fromLng } = from;
    const { lat: toLat, lon: toLng } = to;

    // Check cache
    const cacheKey = `route:${fromLat}:${fromLng}:${toLat}:${toLng}`;
    const cached = await routeCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        route: JSON.parse(cached),
      });
    }

    // Get weather delay
    const weatherDelay = await weatherClient.getDelay(fromLat, fromLng).catch(() => 0);
    healthMonitor.checkWeatherStatus(weatherDelay >= 0);

    // Calculate route
    const routeResult = routingEngine.route(
      fromLat,
      fromLng,
      toLat,
      toLng,
      departureTime ? new Date(departureTime) : new Date()
    );

    // Apply weather delay
    const totalDuration = routeResult.duration + weatherDelay;

    const response = {
      success: true,
      route: {
        coordinates: routeResult.path.map((n) => ({ lat: n.lat, lng: n.lng })),
        distance: routeResult.distance,
        duration: totalDuration,
        durationBreakdown: {
          base: routeResult.duration,
          weather: weatherDelay,
          total: totalDuration,
        },
      },
    };

    // Cache result
    await routeCache.set(cacheKey, JSON.stringify(response.route), 'route');

    res.json(response);
  } catch (err) {
    healthMonitor.recordError('route_calculation_failed');
    console.error('Routing error:', err);
    res.status(500).json({
      error: 'Failed to calculate route',
      message: (err as Error).message,
    });
  }
});

/**
 * GET /health
 * Health check for routing service
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json(healthMonitor.getHealth());
});

export default router;
