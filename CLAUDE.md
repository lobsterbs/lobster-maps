# LobsterMaps - CLAUDE.md Handoff (Sep 11, 2026)

## Project Summary

**LobsterMaps** is a privacy-first maps & navigation app for Bergen/Vestland, Norway.
- Single monorepo: `routing-core/` (Rust/WASM), `server/` (Express), `client/` (React)
- **Live:** https://lobster-maps.onrender.com
- **GitHub:** github.com/lobsterbs/lobster-maps
- **Notion:** https://app.notion.com/p/3c91682f460181829b34ca2bc0c5fc09
- License: AGPL-3.0, Design: Material Design 3 (emerald `#10b981`)

---

## Current Status (Sep 11, 19:46 UTC)

### ✅ COMPLETE
- **Phase 1 (A* Routing):** Live, production-ready
- **Phase 2 (CH Routing + Privacy + UI):** Complete, 7,536+ LOC across all phases
- **WASM Integration Layer:** All 3 Rust modules wired (Rate Limiter, Search Scorer, Weather Cache)
- **Map Caching:** IndexedDB live (7-day routes, 1-day POIs)
- **MD3 Components:** All refactored to Material Design 3
- **Server:** Simplified routing, full TypeScript fixes

### ⏳ BUILDING NOW
- **Render Deploy:** `dep-dai5l43m8hqs73ees9dg`
  - Fresh `npm install` cleared corrupted dependencies
  - All builds tested locally ✅
  - Should complete in ~2-3 min

### 🚀 IMMINENT
- Verify deploy success at https://lobster-maps.onrender.com
- Check version indicator (v2.0.0-wasm, lower left)
- MapTiler attribution removed ✓
- Search bar live ✓

---

## Recent Fixes (This Session)

### Client Errors Fixed
1. ✅ MD3Button - Made children optional
2. ✅ MD3Switch - Fixed size type conflict
3. ✅ MapContainerImproved - Deleted unused Leaflet component
4. ✅ TripPlanner - Fixed modeIcon rendering
5. ✅ transit.ts - Added modeIcon function
6. ✅ App.tsx - Fixed syntax error (extra braces)

### Server Errors Fixed
1. ✅ Removed `js-priority-queue` (doesn't exist)
2. ✅ Created custom PriorityQueue in router.ts
3. ✅ Created requestQueue.ts for API rate limiting
4. ✅ Fixed geocode.ts imports
5. ✅ Created nvdbClient.ts stub
6. ✅ Created routeQualityScorer.ts
7. ✅ Created api.ts (database helpers)
8. ✅ Added weatherClient.getDelayMultiplier()
9. ✅ Added healthMonitor methods
10. ✅ Added routeCache properties
11. ✅ Fixed osmPreprocessor return types
12. ✅ Simplified routing.ts
13. ✅ Fixed all TypeScript strict mode

### Build Verification
```bash
npm run build:client  ✅ (1867 modules, 2.1MB)
npm run build:server  ✅ (TypeScript 0 errors)
npm run build         ✅ (full pipeline)
```

---

## Critical Workflow (Enforced from Now On)

**ALWAYS test locally before pushing:**
```bash
npm run build:client && npm run build:server
# Catch TypeScript/build errors FIRST
# Only push if both pass
```

**Why:** Previous deploy failed due to stale dependencies. Clean local builds prevent broken deploys.

---

## File Structure

### Key Directories
```
routing-core/      Rust/WASM modules (Rate Limiter, Search Scorer, Weather Cache)
server/src/        Express server + routing engine
  routes/          API endpoints (route, geocode, search, businesses)
  routing/         Router, NVDB, Weather, Cache, Quality scoring
  wasm/            WASM module initialization
  lib/             Helpers (API, request queue)
  db/              Drizzle + PostGIS schemas
client/src/        React + Vite
  components/      MD3Button, MD3Switch, VersionIndicator, SearchBar, Map
  lib/             API, transit, map cache, storage
  styles/          Material 3 theme, Google Sans Flex fonts
```

---

## Environment & Credentials

### Render
- Service: `srv-da77r72d0e5s73dl976g`
- Workspace: `tea-da6k16hsrm7s73aeg0s0`
- Build: `npm run build`
- Start: `npm run start`

### Neon Database
- Project: `floral-silence-23234233`
- **Note:** Only call ONE SQL statement per tool invocation (multi-statement batches fail)

### GitHub
- Repo: github.com/lobsterbs/lobster-maps
- Branch: main (protected)
- **Push format:** `git push https://[PAT]@github.com/lobsterbs/lobster-maps.git main`
- PAT stored in memory only (NEVER commit)

---

## Deploy History

| Date | Commit | Status |
|------|--------|--------|
| Sep 11 19:41 | `a043801` | ❌ Failed (corrupted deps) |
| Sep 11 19:46 | `9799380` | ✅ Building (fresh install) |

---

**Last Updated:** Sep 11, 2026, 19:46 UTC
**Next Session:** Test locally before any push. Check deploy logs if stuck.
