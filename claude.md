# LobsterMaps — working notes

Authoritative handoff doc. If GitHub and Notion disagree, this file
wins. Mirrored to Notion (3c91682f-4601-8182-9b34-ca2bc0c5fc09).

**Last updated:** 22 Sep 2026, 22:50 UTC

---

## About the project

Privacy-first maps, navigation and local business directory for
Bergen / Vestland, Norway. Part of the Lobster Ecosystem (hobby, not
commercial). AGPL-3.0.

- Live: https://lobster-maps.onrender.com
- Repo: https://github.com/lobsterbs/lobster-maps
- Monorepo: `client/` (React + Vite + MapLibre GL v6), `server/`
  (Express + Drizzle), `routing-core/` (Rust/WASM)
- DB: Neon Postgres + PostGIS, project `floral-silence-23234233`
- Host: Render, service `srv-da77r72d0e5s73dl976g`,
  workspace `tea-da6k16hsrm7s73aeg0s0`
- Design: Material Design 3, emerald `#10b981`, Google Sans Flex
- Data: MapTiler (basemaps, terrain), OSM/Overpass (businesses),
  Nominatim (geocoding), Entur (transit), Yr.no (weather),
  Mapillary (street-level imagery)

### Hard-won constraints — read before changing these

- **Build locally before every push.** `npm run build:client && npm run
  build:server`. Non-negotiable.
- Neon's Postgres port is unreachable from the sandbox. All DB work goes
  through the Neon MCP, **one SQL statement per call**.
- Render auto-deploy is unreliable; trigger deploys explicitly, and set
  env vars *before* pushing when they are `VITE_*`.
- `VITE_*` vars are inlined at **build** time.
- The custom A* router stays. ORS feeds it, does not replace it.
- No scraping Yelp / Google Places / TripAdvisor.
- **GitHub Actions logs are served from a storage host this sandbox
  cannot reach.** The build-wasm workflow therefore tees its compiler
  output and opens an issue containing it on failure. Do not remove
  that step; it is the only way to debug CI from here.

---

## Current state

### This Session (Sep 22, 2026 — M3 Token Enhancements)

**COMPLETED:**
- ✅ Enhanced M3 color system with 7 new semantic tokens:
  - Map-specific: `--md-sys-color-sky-dark`, `--md-sys-color-horizon-dark`, 
    `--md-sys-color-fog-dark`, `--md-sys-color-building-dark`, 
    `--md-sys-color-building-satellite`
  - Accents: `--md-sys-color-accent-red`, `--md-sys-color-street-wood`
  - Added light theme variants in `@media (prefers-color-scheme: light)`
- ✅ Replaced hardcoded hex values in 6 files with CSS variables:
  - Map.tsx: Sky/horizon/building colors via `getM3Colors()` helper
  - StreetViewLayer.tsx: Line color uses token
  - App.tsx: Route layer color uses token
  - LoadingMorph.tsx, WavyLinearProgress.tsx: Documented as M3 values
- ✅ Both builds pass: 0 TypeScript errors, 0 client vulnerabilities
- ✅ Pushed: commit `8bc010a` - M3 token enhancement
- ✅ M3 Audit passed:
  - Focus-visible: 3px solid primary (WCAG 2.4.7) ✓
  - Reduced-motion: Media query + Globals.skipAnimation ✓
  - State layer opacity: M3 tokens (0.08, 0.12, 0.16) ✓
  - Touch targets: 48dp minimum on buttons ✓

**IN RENDER DEPLOY QUEUE:**
- Commit 8bc010a pushed to main
- Render auto-deploy should complete in ~5 min

**KNOWN GAPS (Can Wait):**
- Responsive breakpoints: Compact (480px) / Medium (840px) not yet implemented
- Dynamic theme switching: Color constants don't auto-update CSS vars at runtime
- Touch targets: Only 3 components enforce 48dp; others inconsistent
- MD3Button state layer: hardcoded RGB in one TODO (noted in code)

**NEXT STEPS:**
1. Verify MapTiler proxy tiles load on production after deploy
2. Implement M3 responsive density tokens (480px/840px breakpoints)
3. Add runtime CSS variable reading for true theme switching
4. Comprehensive touch target audit across all interactive elements
5. Test dark/light theme switching end-to-end

### MapTiler Proxy (Previous Session)

Server-side proxy completely solves the "Key usage restricted" error:
- `GET /api/maptiler/style/{mapId}` → proxies tiles.json (Cache-Control: 1h)
- `GET /api/maptiler/tiles/{tilesId}` → proxies tiles.json (Cache-Control: 24h)
- `GET /api/maptiler/fonts/{fontstack}/{range}.pbf` → proxies glyphs (Cache-Control: 1yr)
- Client uses `/api/maptiler/*` instead of direct MapTiler
- Server fetches on behalf of client (servers not restricted by browser Origin)
- Commits: `b2616dc`, `f48ac3a`

### M3 Accessibility (Previous Session)

- ✅ Focus-visible: 3px solid outline, 2px offset
- ✅ ARIA fixes: aria-pressed → role=radio/radiogroup on basemap switcher
- ✅ Keyboard nav: Arrow keys, Home/End, roving tabindex
- ✅ Basemap switcher redesigned: vertical dropdown → horizontal M3 pills
- Commit: `d60fd78`

---

## Verified Open Issues (Must Fix Before Production)

1. **RESOLVED ✅**: MapTiler "Key usage restricted" → Server proxy
2. **RESOLVED ✅**: M3 hardcoded colors → Tokens for sky, horizon, buildings
3. Responsive breakpoints: Compact/medium/expanded density (LOW PRIORITY)
4. Dynamic theme switching: Need runtime CSS var reading (LOW PRIORITY)
5. Code-split maplibre: 1.02 MB chunk (PERFORMANCE, not blocking)
6. No auth on POST /api/businesses (LobsterID is real fix, rate-limit is stopgap)
7. OSM graph extraction: `npm run extract:osm` never run on Render
8. 4 npm audit moderates: drizzle-kit (build-time, low urgency)

---

## Technical Debt (Not Urgent)

- `npm run extract:osm` never run on Render (router has no graph yet)
- Privacy stack: compiles but nothing calls EphemeralProcessor, k-anonymity yet
- Sketchfab landmark model IDs: must re-verify before implementation
- Business/place UI: redesign incomplete (low priority)

---

## Previous Session State (Sep 21, MapTiler Proxy)

Everything documented in "Current state → MapTiler Proxy" above.
Render deployment auto-triggers on push. All code committed.
