# LobsterMaps Custom Routing Engine

**Fast, lightweight, local-first routing for Bergen/Vestland.**

## Architecture

```
OSM Graph (Bergen roads)
    ↓ (A* pathfinding)
Route Calculation
    ├─ Traffic Predictor (learns rush hours)
    ├─ NVDB Closures (real-time road status)
    ├─ Weather Adjustments (Yr.no)
    └─ Quality Scoring (local ML)
    ↓
Cached Result
    ↓
API Response (polyline + metadata)
```

## Components

### router.ts
- **A* pathfinding** with Haversine heuristic
- **TrafficPredictor** learns time-of-day patterns via EMA (exponential moving average)
- **Turn restrictions** from OSM (no U-turns, weight/height limits)
- Supports multiple road types, speed limits, closures

### osmPreprocessor.ts
- Extracts Bergen road network from Overpass API
- Builds directed graph with ~20k nodes, ~40k edges
- Processes turn restrictions from OSM relations
- One-time extraction (~30 min), result cached in `data/bergen-routing-graph.json`

### nvdbClient.ts
- **NVDB** = Nasjonalt vegdatabank (Norwegian road database)
- Free API, no auth, publishes real-time closures + incidents
- Checks for closed roads before routing
- Caches results 5 min (good enough for real-time)

### weatherClient.ts
- **Yr.no** (Norwegian Meteorological Institute) free API
- Fetches current weather, calculates delay multiplier
- Snow → +40% delay, rain → +15%, extreme → avoid
- Caches 10 min per location

### routeQualityScorer.ts
- **Local ML**: Anomaly detection via Z-score
- Scores routes 0-100 based on distance/time/traffic/safety
- Learns from observations (needs 5+ per condition to detect anomalies)
- Detects unusual congestion patterns

### cache.ts
- Routes cached 1 hour (LRU cleanup if >1000 routes)
- Health monitoring (graph loaded? APIs working?)
- Error tracking (what's failing?)

## API Endpoints

### POST /api/route
Calculate a route.

**Request:**
```json
{
  "from": [60.3917, 5.3211],
  "to": [60.3811, 5.3333],
  "departureTime": "2026-09-04T08:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "cached": false,
  "route": {
    "distance": 2500,
    "duration": 180,
    "durationWithDelays": 210,
    "delays": {
      "incidents": 15,
      "weather": 15,
      "total": 30
    },
    "polyline": [[5.321, 60.391], ...],
    "steps": [...],
    "weather": {
      "condition": "rain",
      "temperature": 12,
      "delayMultiplier": 1.15
    },
    "quality": {
      "overall": 78,
      "recommendation": "Good route"
    },
    "incidents": [...]
  }
}
```

### GET /api/route/health
System status.

**Response:**
```json
{
  "ok": true,
  "graphLoaded": true,
  "nvdbResponding": true,
  "weatherResponding": true,
  "cacheSize": 45,
  "uptime": 3600,
  "errors": []
}
```

### GET /api/route/incidents
Current road closures and incidents.

**Response:**
```json
{
  "success": true,
  "incidents": [...],
  "count": 3,
  "lastUpdate": "2026-09-04T12:34:56Z"
}
```

### GET /api/route/stats
ML and caching statistics.

**Response:**
```json
{
  "cache": {
    "size": 45,
    "maxSize": 1000
  },
  "ml": {
    "observations": 234,
    "anomalyRate": "2.15%"
  }
}
```

### POST /api/route/learn
Record a traffic observation (for ML training).

**Request:**
```json
{
  "speedMultiplier": 0.65,
  "hour": 8,
  "minute": 30,
  "dayOfWeek": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Traffic observation recorded"
}
```

## Performance

- **Graph load:** ~1 second (80MB JSON)
- **Route calc:** 40-60ms (no cache), <10ms (cached)
- **NVDB query:** 200-400ms (cached 5 min)
- **Total latency:** 300-500ms / request
- **Memory:** ~150MB running (100MB graph + buffer)
- **Disk:** 80MB graph file

## Traffic Learning Example

### Day 1: Morning (08:00, Monday)
```
Observed: speed 30 km/h on primary road (usual ~60 km/h)
Multiplier: 0.5

POST /api/route/learn
→ "08:00:Monday" pattern updated
→ speedMultiplier = 0.3*0.5 + 0.7*0.6 = 0.57
```

### Day 2: Same time
```
Observed: speed 35 km/h
Multiplier: 0.58

Pattern update:
→ speedMultiplier = 0.3*0.58 + 0.7*0.57 = 0.573
→ confidence increases
```

### Week 1: Pattern emerges
```
Route calculations now account for 8am rush hour
Time estimates become +20% accurate
Anomaly detection spots unusual congestion
```

## Extending the Engine

### Add a new data source (e.g., bus delays)
1. Create `src/routing/busClient.ts`
2. Fetch bus delay data
3. Calculate multiplier
4. Pass to routing endpoint

### Improve turn instructions
1. Modify `router.ts` `generateSteps()`
2. Extract way names from edge data
3. Calculate turn angles
4. Generate "Turn right onto Bryggen"

### Add multi-modal routing
1. Create `src/routing/transitRouter.ts`
2. Load bus network graph
3. Calculate car + transit time
4. Return combined route with transfers

## Data Sources

All free, no auth required:

| Source | Data | Update | Link |
|--------|------|--------|------|
| OpenStreetMap | Road network, restrictions | Live | https://overpass-api.de/ |
| NVDB | Road closures, incidents | 5 min | https://dataut.vegvesen.no/ |
| Yr.no | Weather forecast | 6 hours | https://api.met.no/ |

## Testing

```bash
# Extract graph (one-time, ~30 min)
npm run extract:osm

# Test routing
npm run dev

# Then in another terminal:
curl -X POST http://localhost:3000/api/route \
  -H "Content-Type: application/json" \
  -d '{"from":[60.3917,5.3211],"to":[60.3811,5.3333]}'
```

## Troubleshooting

**Routes return error: "Route not found"**
- Check coordinates are in Bergen [59.8, 60.5] lat, [4.7, 5.9] lng
- Verify graph extracted: `ls data/bergen-routing-graph.json`

**Health check returns nvdbResponding: false**
- NVDB might be temporarily down
- Routing still works (doesn't depend on incidents)
- Will retry in 5 min

**Weather not in response**
- Yr.no rate limited or down
- Weather data optional, routing continues
- Check logs for "Weather unavailable"

**Routes take 200+ms**
- First request loads 80MB graph (normal)
- Subsequent requests use cached graph
- NVDB query takes 200-400ms (can't speed up)

## Future Improvements

1. **Traffic patterns from real users** (needs more data collection)
2. **Bus integration** (route + transit multimodal)
3. **Bike-friendly routing** (separate graph, different costs)
4. **Offline mode** (pre-cache graph locally)
5. **Alternative routes** (k-shortest paths, not just A*)
6. **Real-time traffic speeds** (integrate live speed sensors)

---

Built for LobsterMaps, Bergen/Vestland. Local-first, privacy-respecting, fast.
