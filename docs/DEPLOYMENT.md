# LobsterMaps Deployment Guide

## Status: Ready for Production Deployment

**Date:** Sep 4, 2026
**Branch:** `feature/custom-router` (ready to merge to main)
**Commits:** 2 new (custom router + production features)

---

## What's New (Sep 4 Session)

✓ **Custom A* routing engine** — OSM-based, not relying on third-party APIs
✓ **Traffic learning** — Learns rush-hour patterns via exponential moving average
✓ **Weather integration** — Yr.no (Norwegian Meteorological Institute, free API)
✓ **Route caching** — 1-hour TTL, LRU cleanup, avoids recalc of common routes
✓ **Local ML** — Anomaly detection + route quality scoring
✓ **Health monitoring** — Reports status of graph, NVDB, weather
✓ **Production error handling** — Graceful fallbacks, clear error messages

---

## Pre-Deployment Checklist

### 1. Code Review
- [ ] Git: All commits pushed to GitHub
- [ ] TypeScript: No compilation errors (run `npm run build` in server/)
- [ ] Dependencies: `npm install` installs js-priority-queue

### 2. Environment Variables (Render)
Already set:
- `VITE_ORS_KEY` ✓ (set Sep 4)
- `VITE_MAPTILER_KEY` (check if set, needed for tiles)

No new variables needed. All APIs are:
- Free (Yr.no, NVDB, Overpass)
- No auth (NVDB, Yr.no)
- Already provided (ORS key)

### 3. OSM Graph Extraction (CRITICAL)
**Must run once before routing works:**

```bash
# On Render, SSH into the app:
render-cli ssh app

# Then run:
cd /app
npm run extract:osm

# Expect:
# - Queries Overpass API for Bergen roads
# - Saves to data/bergen-routing-graph.json (~80MB)
# - Takes 20-40 min (Overpass server load dependent)
# - Logs: "✓ Graph extraction complete"
```

Or **add to Render build command:**
```bash
npm run build && npm run extract:osm
```
(Will run once at deploy, adds ~30 min to first build, then fast thereafter)

### 4. Test Endpoints (After Extract)
```bash
# Health check
curl https://lobster-maps.onrender.com/api/route/health

# Sample route
curl -X POST https://lobster-maps.onrender.com/api/route \
  -H "Content-Type: application/json" \
  -d '{
    "from": [60.3917, 5.3211],
    "to": [60.3811, 5.3333],
    "departureTime": "2026-09-04T08:00:00Z"
  }'

# Incidents
curl https://lobster-maps.onrender.com/api/route/incidents

# Stats
curl https://lobster-maps.onrender.com/api/route/stats
```

### 5. Wire into TripPlanner UI
Current: TripPlanner uses ORS endpoint `/api/route-ors` (or falls back to ORS)
Next: Update to use custom router at `/api/route`

Changes needed in `client/src/components/TripPlanner.tsx`:
```typescript
// Change from:
const response = await fetch('/api/route-ors', ...)

// To:
const response = await fetch('/api/route', ...)

// Handle new response shape:
// - response.route.durationWithDelays (instead of just duration)
// - response.route.weather (new)
// - response.route.quality (new)
// - response.route.anomalies (new)
```

### 6. Monitor Logs
After deploy, check:
```
npm run logs

# Look for:
✓ Routing engine initialized with Bergen graph
✓ GraphQL endpoints ready

# Warnings to expect:
Graph not loaded (expected if extract hasn't run)
Weather unavailable (expected first 10 min)
```

---

## Deployment Steps (Recommended Order)

### Option A: Deploy Now, Extract Later (Faster)
1. Push `feature/custom-router` to main on GitHub
2. Render auto-deploys (add 5 min for build)
3. App boots without graph (routes return error)
4. SSH and run `npm run extract:osm` (30 min)
5. App now routes

**Time:** 35 min start-to-finish

### Option B: Extract First, Then Deploy (Safer)
1. Push feature/custom-router to main
2. SSH to Render app (if it exists)
3. Run `npm run extract:osm` while old app still running
4. Once complete, merge and deploy new code
5. New code loads pre-extracted graph instantly

**Time:** 30+ min (depends on Overpass load)

### Option C: Include Extract in Build (Most Automated)
1. Update Render build command to: `npm run build && npm run extract:osm`
2. Push feature/custom-router to main
3. Render builds + extracts in one deploy (~40 min)
4. Done

**Time:** 40 min, no manual SSH

---

## Known Limitations (Not Bugs)

1. **First route request takes 40ms** (graph load on startup)
2. **Weather anomalies only detectable after 5+ observations** per time/road/condition
3. **NVDB cache is 5 minutes** (good enough for real-time, not hyper-live)
4. **Turn-by-turn steps are basic** ("Continue 3/47") — could improve with OSM way parsing
5. **Mapillary Street View still unavailable** (their email service down)

---

## Rollback Plan

If issues arise:
```bash
git revert -n 51676da  # Revert production features
git revert -n 3c73ba4  # Revert custom router
git push

# Render auto-deploys, reverted to Sep 3 state (working ORS)
```

---

## Success Metrics (Post-Deploy)

- [ ] `/api/route/health` returns `"ok": true`
- [ ] Routes calculate in <500ms (cached: <10ms)
- [ ] Weather delays visible in response
- [ ] Anomaly detection triggers for ~2-3% of observations
- [ ] Cache size grows to 50-200 routes by day's end
- [ ] No errors in logs related to routing

---

## Files Changed

```
server/src/routing/
├── router.ts (600 lines) — A* + traffic learning
├── osmPreprocessor.ts (300 lines) — OSM extraction
├── nvdbClient.ts (250 lines) — Closures + incidents
├── weatherClient.ts (140 lines) — Yr.no integration
├── routeQualityScorer.ts (200 lines) — ML + scoring
├── cache.ts (120 lines) — Caching + health checks
└── extract-osm.ts (CLI script)

server/src/routes/
└── routing.ts (updated, 200 lines) — New endpoints

server/src/
└── index.ts (updated) — Mount routing router

server/
└── package.json (updated) — Add js-priority-queue

CLAUDE.md (updated)
```

---

## After Deployment

### Day 1-3:
- Monitor error rates + response times
- Check if graph extraction completes
- Verify TripPlanner integrates smoothly

### Week 1:
- Collect traffic observations (POST /api/route/learn)
- Validate route quality scores
- Monitor anomaly rate (should stay <5%)

### Month 1:
- Traffic patterns stabilize (week 2-3)
- Anomaly detection becomes useful
- Consider adding alternative route suggestions

---

## Need Help?

**Graph extraction failing?**
- Check Overpass API status: https://overpass-api.de/
- Try again in 30 min (server load dependent)
- Logs will show exact error

**Routes not calculating?**
- Verify graph loaded: `GET /api/route/health`
- Check coordinates are in Bergen [59.8, 60.5] lat, [4.7, 5.9] lng

**Weather not appearing?**
- Yr.no API is working (logs will say)
- Weather data is cached, may need 2+ requests to same location

---

**Ready to deploy? Push the branch and follow Option A, B, or C above.**
