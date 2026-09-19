# LobsterMaps — Active Work Session (Sep 19, 2026)

## Current Issue: Map Not Loading on Render

**Status:** Map mounts but never fires 'load' event. Spinner hangs forever.

### What Works
- Server starts on Render ✅
- Client files served correctly ✅
- React app mounts ✅
- MapLibreGL instance created ✅
- All JS/CSS assets load with 0 errors ✅
- MapTiler API key is set ✅

### What's Broken
- MapLibreGL load event never fires
- No error events in console
- Map stays blank, UI spinner spins forever
- Likely: tile source unreachable or MapLibre hangs on dataloading

### Latest Commits (Ready to Deploy)
- `7386b4e` - Added dataloading/data event listeners (Sep 19)
- `18c96e4` - Added 10s timeout, removed API key logging
- `3b4f3a4` - Added tile URL & source logging
- `f423b7c` - Added detailed debug logging
- `8968b14` - Added favicon.ico

### Next Steps
1. **Wait for Render redeploy** of commit 7386b4e
2. **Hard refresh** and check console for:
   - `📥 Map data loading...` → dataloading event fired?
   - `📦 Map data event: ...` → which data type?
   - `⏱️ Map load timeout` → still hanging?
3. **If no dataloading event:** Tiles aren't being requested at all
   - Check: style object structure
   - Check: MapTiler URL format
4. **If dataloading fires but no load:** Stuck on tile fetch
   - Check: Network tab in DevTools for tile requests
   - Check: CORS headers on MapTiler responses
5. **If timeout fires:** Network timeout (Render can't reach MapTiler)
   - Fallback: Use OSM raster tiles only for now
   - Check: Render outbound network config

### Detailed Logging Added

**In Map.tsx:**
- Style object structure logged (version, sources, layers)
- Vector source URL logged (truncated, no secrets)
- dataloading event → `📥 Map data loading...`
- data event → `📦 Map data event: {sourceDataType}`
- error event → `🔴 MapLibre error: {message}`
- load event → `✅ Map ready!`
- 10s timeout → `⏱️ Map load timeout (10s)`

**In App.tsx:**
- `🚀 App mounted`
- `✅ Map ready!` (when onMapReady fires)
- `❌ Map error: {message}` (when onError fires)

### Hypothesis
MapTiler vector tiles are unreachable or hanging due to:
1. Render network isolation (needs outbound HTTPS to api.maptiler.com)
2. CORS issue (MapTiler not returning Access-Control-Allow-Origin)
3. Malformed style object (missing required fields)
4. MapLibre bug with vector source URL format

### Fallback Plan
If MapTiler unreachable from Render:
- Switch to OSM raster tiles globally
- OR use simple Carto positron/voyager styles (free, hosted)
- Update darkStyle() to return raster-only config

### Files Modified (This Session)
- `client/src/components/Map.tsx` - Added all debug logging
- `client/src/App.tsx` - Added mount/error logging
- `client/public/favicon.ico` - Created (red lobster shell)

### Deploy Command (if needed)
```bash
cd /home/claude/lobster-maps
npm run build:client && npm run build:server  # Test locally first
git add -A
git commit -m "message"
git push origin main  # Uses GH_TOKEN from env
# Then trigger redeploy on Render dashboard
```

---

## Previous Sessions Summary

### Bug Fixes Shipped (Sep 18)
- Favicon 404 → created favicon.ico
- SPA routing regex intercepting assets → fixed to only catch routes without dots
- WASM not available → added Node.js fallback with honest logging
- OSM fallback tiles → implemented when MapTiler key missing
- Lucide icons for map/satellite toggle → replaced text labels

### Material You 3 Refactor (In Progress)
- ⚠️ 20+ hardcoded hex colors blocking dark theme (HIGH PRIORITY)
- ⚠️ State layer opacity using Tailwind, not M3 spec
- ⚠️ No reduced-motion media query (WCAG violation)
- ✅ M3 tokens.css with semantic scale
- See BUG_AUDIT.md for full list

### Stack
- Client: Vite, React, MapLibre v6.9.1, TypeScript, Tailwind (gradual removal)
- Server: Express, Drizzle ORM, Neon (PostgreSQL), Node.js
- Rendering: Render (srv-da77r72d0e5s73dl976g)
- Live: https://lobster-maps.onrender.com
- Repo: https://github.com/lobsterbs/lobster-maps

---

## Quick Links
- GitHub: https://github.com/lobsterbs/lobster-maps
- Render: https://dashboard.render.com → srv-da77r72d0e5s73dl976g
- Notion: LobsterMaps project page
