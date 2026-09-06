import { Router } from 'express';
import { Router as RoutingEngine, RouteResult } from '../routing/router';
import { nvdbClient } from '../routing/nvdbClient';
import { weatherClient } from '../routing/weatherClient';
import { routeQualityScorer } from '../routing/routeQualityScorer';
import { routeCache, healthMonitor } from '../routing/cache';
import { join } from 'path';

const router = Router();
const routingEngine = new RoutingEngine();
let graphLoaded = false;

// Load graph on startup
const graphPath = join(process.cwd(), 'data', 'bergen-routing-graph.json');

try {
  routingEngine.loadGraph(graphPath);
  graphLoaded = true;
  console.log('✓ Routing engine initialized with Bergen graph');
  healthMonitor.checkGraphStatus(true);
} catch (err) {
  console.error('✗ Failed to load routing graph:', err);
  console.warn('Graph will be extracted on first request (slow, ~30 min)');
  healthMonitor.checkGraphStatus(false);
}

// POST /api/route
// Calculate route with traffic-aware timing, weather, closures, and quality scoring
router.post('/', async (req, res) => {
  try {
    if (!graphLoaded) {
      return res.status(503).json({
        error: 'Routing graph not loaded. Server initializing (~30 min first time).',
      });
    }

    const {
      from: [fromLat, fromLng],
      to: [toLat, toLng],
      departureTime,
      mode = 'driving',
    } = req.body;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({
        error: 'Missing coordinates: from and to must be [lat, lng]',
      });
    }

    // Check cache first
    const cached = routeCache.get([fromLat, fromLng], [toLat, toLng]);
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        route: cached,
      });
    }

    // Fetch incidents + weather in parallel
    const [incidents, weather] = await Promise.all([
      nvdbClient.getIncidents('Hordaland').catch(() => {
        healthMonitor.checkNVDBStatus(false);
        return [];
      }),
      weatherClient.getWeather(fromLat, fromLng).catch(() => {
        healthMonitor.checkWeatherStatus(false);
        return null;
      }),
    ]);

    healthMonitor.checkNVDBStatus(incidents.length >= 0);
    healthMonitor.checkWeatherStatus(weather !== null);

    const closedWayIds = incidents.filter((inc) => inc.type === 'closed').map((inc) => inc.id);

    // Calculate route
    let routeResult: RouteResult;
    try {
      routeResult = routingEngine.route(
        fromLat,
        fromLng,
        toLat,
        toLng,
        departureTime ? new Date(departureTime) : new Date(),
        closedWayIds
      );
    } catch (err) {
      healthMonitor.recordError('route_calculation_failed');
      return res.status(404).json({
        error: `Route not found: ${(err as Error).message}`,
      });
    }

    // Estimate delays
    const incidentDelay = await nvdbClient.estimateDelay(
      routeResult.path.map((n) => ({ lat: n.lat, lng: n.lng }))
    );

    const weatherDelay = weather
      ? Math.ceil(routeResult.duration * (weatherClient.getDelayMultiplier(weather) - 1))
      : 0;

    const totalDuration = routeResult.duration + incidentDelay + weatherDelay;

    // Detect traffic anomalies
    const trafficAnomalies = routeResult.trafficFactors
      .slice(0, 5)
      .map((factor) => ({
        ...factor,
        anomaly: routeQualityScorer.detectCongestionAnomaly(
          new Date().getHours(),
          new Date().getDay(),
          factor.factor,
          'mixed'
        ),
      }));

    // Score route quality
    const quality = routeQualityScorer.scoreRoute(
      routeResult.distance,
      totalDuration,
      routeResult.trafficFactors[0]?.factor || 0.9,
      weather?.condition || 'clear',
      incidents.length > 0
    );

    const response = {
      success: true,
      cached: false,
      route: {
        distance: routeResult.distance,
        duration: routeResult.duration,
        durationWithDelays: totalDuration,
        delays: {
          incidents: incidentDelay,
          weather: weatherDelay,
          total: incidentDelay + weatherDelay,
        },
        polyline: routeResult.polyline,
        steps: routeResult.steps,
        trafficFactors: routeResult.trafficFactors,
        anomalies: trafficAnomalies,
        weather: weather
          ? {
              condition: weather.condition,
              temperature: weather.temperature,
              windSpeed: weather.windSpeed,
              precipitation: weather.precipitation,
              delayMultiplier: weatherClient.getDelayMultiplier(weather),
            }
          : null,
        quality,
        incidents: incidents
          .filter(
            (inc) =>
              Math.abs(inc.location.lat - fromLat) < 0.1 &&
              Math.abs(inc.location.lng - fromLng) < 0.1
          )
          .slice(0, 5),
      },
    };

    // Cache the result (1 hour TTL)
    routeCache.set([fromLat, fromLng], [toLat, toLng], response.route, 3600000);

    res.json(response);
  } catch (err) {
    healthMonitor.recordError('unhandled_routing_error');
    console.error('Routing error:', err);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// GET /api/route/health
// Health check: returns system status
router.get('/health', async (req, res) => {
  try {
    const nvdbOk = await nvdbClient.getIncidents('Hordaland').then(
      () => true,
      () => false
    );
    const weatherOk = await weatherClient.getWeather(60.3917, 5.3211).then(
      () => true,
      () => false
    );

    const status = healthMonitor.getStatus(graphLoaded, nvdbOk, weatherOk, routeCache.size());

    res.status(status.ok ? 200 : 503).json(status);
  } catch (err) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

// GET /api/route/incidents
// Get current road incidents for map display
router.get('/incidents', async (req, res) => {
  try {
    const incidents = await nvdbClient.getIncidents('Hordaland');

    res.json({
      success: true,
      incidents: incidents.map((inc) => ({
        id: inc.id,
        type: inc.type,
        severity: inc.severity,
        location: inc.location,
        description: inc.description,
        estimatedEnd: inc.estimatedEnd?.toISOString(),
      })),
      count: incidents.length,
      lastUpdate: new Date().toISOString(),
    });
  } catch (err) {
    healthMonitor.recordError('nvdb_fetch_failed');
    console.error('Incidents fetch error:', err);
    res.status(500).json({
      error: 'Failed to fetch incidents',
    });
  }
});

// GET /api/route/stats
// Get ML and caching stats
router.get('/stats', (req, res) => {
  const stats = routeQualityScorer.getStats();
  res.json({
    cache: {
      size: routeCache.size(),
      maxSize: 1000,
    },
    ml: {
      observations: stats.observationCount,
      anomalyRate: stats.anomalyRate.toFixed(2) + '%',
    },
  });
});

// POST /api/route/learn
// Record actual traffic observation for pattern learning
router.post('/learn', (req, res) => {
  try {
    const { speedMultiplier, hour, minute, dayOfWeek } = req.body;

    if (speedMultiplier == null || hour == null || minute == null || dayOfWeek == null) {
      return res.status(400).json({
        error: 'Missing parameters: speedMultiplier, hour, minute, dayOfWeek',
      });
    }

    // Feed observation into traffic predictor
    routingEngine.recordTraffic(speedMultiplier, hour, minute, dayOfWeek);

    res.json({
      success: true,
      message: 'Traffic observation recorded',
    });
  } catch (err) {
    console.error('Learning error:', err);
    res.status(500).json({
      error: 'Failed to record observation',
    });
  }
});

export default router;
