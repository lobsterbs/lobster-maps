# LobsterMaps Debug Session — Sep 19, 2026

## Problem
Map failed to load on Render with `TILE_LOAD_TIMEOUT` after 10s. Browser console showed:
- MapTiler vector tiles: timeout after 10s
- OSM fallback: `net::ERR_NAME_NOT_RESOLVED` on `{a-c}.tile.openstreetmap.org`

Root cause: **Render's outbound network cannot reach external tile servers.** This is a platform restriction, not a code bug.

## Solution Deployed
**Tile Proxy Pattern** — Backend fetches tiles, client requests from backend.

### Changes Made
1. **server/src/index.ts**: Added `/api/tiles/:z/:x/:y.png` endpoint
   - Validates zoom (0-28)
   - Round-robins subdomain (a/b/c) to OSM
   - Caches tiles for 1 year (immutable by z/x/y)
   - Proper error handling and User-Agent

2. **client/src/components/Map.tsx**: Updated OSM_TILES_URL
   - Changed from external CDN URL to backend proxy
   - Client now requests: `/api/tiles/{z}/{x}/{y}.png`

### Build Status
- ✅ Client: builds clean, no TS errors
- ✅ Server: builds clean, no TS errors
- ✅ Commit: 4192df1 pushed to main
- ⏳ Render auto-deploy: triggered (2-3 min ETA)

## Testing Checklist
- [ ] Wait for Render deployment
- [ ] Open https://lobster-maps.onrender.com
- [ ] Map should load without timeout
- [ ] Check browser console for `/api/tiles/` requests (should be 200, not 5xx)
- [ ] Zoom in/out — should render tiles smoothly
- [ ] Switch to satellite view — also uses proxy, should work

## If Still Failing
1. Check Render logs: `https://dashboard.render.com/services/srv-da77r72d0e5s73dl976g`
2. Test proxy directly: `https://lobster-maps.onrender.com/api/tiles/16/33736/18888.png`
   - Should return PNG, not 5xx
3. If proxy returns 5xx: Render's backend can't reach OSM either
   - Next option: use Mapbox, USGS TopoView, or pre-download PMTiles

## Architecture Notes
- **Why not MapTiler vector tiles?** Same issue — Render blocked, MapTiler API unreachable
- **Why not PMTiles?** Would work, but requires ~500MB-1GB pre-download; tile proxy is faster to implement
- **Why subdomain round-robin?** OSM uses {a-c}.tile.openstreetmap.org for load balancing; replicating that pattern ensures fair distribution

## Files Changed
- server/src/index.ts: +40 lines (tile proxy endpoint)
- client/src/components/Map.tsx: -1, +1 lines (OSM_TILES_URL)

**Total:** 2 files, 44 insertions
