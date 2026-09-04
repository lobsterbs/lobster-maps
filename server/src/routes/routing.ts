import { Router } from 'express';
import { Router as RoutingEngine, RouteResult } from '../routing/router';
import { nvdbClient } from '../routing/nvdbClient';
import { join } from 'path';

const router = Router();
const routingEngine = new RoutingEngine();

// Load graph on startup
const graphPath = join(process.cwd(), 'data', 'bergen-routing-graph.json');

try {
  routingEngine.loadGraph(graphPath);
  console.log('Routing engine initialized with Bergen graph');
} catch (err) {
  console.error('Failed to load routing graph:', err);
  console.error('Graph must be generated. Run: npm run extract-osm');
}

// POST /api/route
// Calculate route with traffic-aware timing and closure checking
router.post('/', async (req, res) => {
  try {
    const {
      from: [fromLat, fromLng],
      to: [toLat, toLng],
      departureTime,
      mode = 'driving', // driving, transit, cycling, walking
    } = req.body;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({
        error: 'Missing coordinates: from and to must be [lat, lng]',
      });
    }

    // Check NVDB for closures
    const incidents = await nvdbClient.getIncidents('Hordaland');
    const closedWayIds = incidents
      .filter((inc) => inc.type === 'closed')
      .map((inc) => inc.id);

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
      return res.status(404).json({
        error: `Route not found: ${err}`,
      });
    }

    // Estimate delay from incidents
    const delay = await nvdbClient.estimateDelay(
      routeResult.path.map((n) => ({ lat: n.lat, lng: n.lng }))
    );

    // Add incident delay to total duration
    const totalDuration = routeResult.duration + delay;

    res.json({
      success: true,
      route: {
        distance: routeResult.distance,
        duration: routeResult.duration,
        durationWithIncidents: totalDuration,
        delayFromIncidents: delay,
        polyline: routeResult.polyline,
        steps: routeResult.steps,
        trafficFactors: routeResult.trafficFactors,
        incidents: incidents
          .filter(
            (inc) =>
              Math.abs(inc.location.lat - fromLat) < 0.1 &&
              Math.abs(inc.location.lng - fromLng) < 0.1
          )
          .slice(0, 5),
      },
    });
  } catch (err) {
    console.error('Routing error:', err);
    res.status(500).json({
      error: 'Internal server error',
    });
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
    });
  } catch (err) {
    console.error('Incidents fetch error:', err);
    res.status(500).json({
      error: 'Failed to fetch incidents',
    });
  }
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
