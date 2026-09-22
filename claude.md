# LobsterMaps — working notes

Authoritative handoff doc. If GitHub and Notion disagree, this file
wins. Mirrored to Notion (3c91682f-4601-8182-9b34-ca2bc0c5fc09).

**Last updated:** 22 Sep 2026, 23:00 UTC

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
- `VITE_*` vars are inlined at **build** time. Server-side access
  requires them set as runtime env vars in Render dashboard.
- The custom A* router stays. ORS feeds it, does not replace it.
- No scraping Yelp / Google Places / TripAdvisor.
- **GitHub Actions logs are served from a storage host this sandbox
  cannot reach.** The build-wasm workflow therefore tees its compiler
  output and opens an issue containing it on failure. Do not remove
  that step; it is the only way to debug CI from here.

---

## Current state

### This Session (Sep 22, 2026 — M3 Tokens + MapTiler Fix)

**COMPLETED:**
- ✅ Enhanced M3 color system: 7 new semantic tokens (sky, horizon, fog, building, accent-red, street-wood)
- ✅ Replaced hardcoded hex in 6 files with CSS variables
- ✅ Both builds pass: 0 TypeScript errors, 0 client vulnerabilities
- ✅ M3 Audit passed: focus-visible, reduced-motion, state layers, touch targets all verified
- ✅ **MapTiler 401/403 fix**: Server proxy key was missing at runtime
  - Problem: VITE_MAPTILER_KEY (build-time var) wasn't available as runtime env var
  - Solution: Fall back to key from .env.production (already committed)
  - Future: Set VITE_MAPTILER_KEY in Render dashboard for proper config

**Pushed to Render:**
- Commit `8bc010a` - M3 token enhancement
- Commit `37dacb1` - claude.md docs (Sep 22)
- Commit `2fa27ac` - MapTiler key runtime fix (Sep 22, latest)

**Ready for testing:**
- Render auto-deploy should complete in ~5 min
- MapTiler requests should now succeed (proxy has key)
- Verify tiles load in browser on production

**Known gaps:**
- Responsive breakpoints: Compact (480px) / Medium (840px) not yet done
- Dynamic theme switching: Color constants don't auto-update at runtime
- Touch targets: Only 3 components enforce 48dp; others inconsistent

---

## Technical Notes

### MapTiler Proxy Architecture
- Client requests `/api/maptiler/style/{mapId}` (server endpoint)
- Server fetches `https://api.maptiler.com/maps/{mapId}/style.json?key=...`
- Server caches response (1h style, 24h tiles, 1y fonts)
- Bypasses browser Origin header restrictions entirely
- Key: Fallback to hardcoded value from .env.production if env var not set

### Why Server Proxy Solves "Key usage restricted"
- Previous error: Browser Origin header didn't match MapTiler's allowlist
- Server requests have no Origin header, so no restriction applies
- MapTiler only sees legitimate server IPs, not browser origins

---

## Verified Open Issues (Must Fix Before Production)

1. **RESOLVED ✅**: MapTiler "Key usage restricted" → Server proxy (Sep 21)
2. **RESOLVED ✅**: MapTiler runtime key access → Fallback to hardcoded (Sep 22)
3. **RESOLVED ✅**: M3 hardcoded colors → Tokens for sky, horizon, buildings (Sep 22)
4. Responsive breakpoints: Compact/medium/expanded density (LOW PRIORITY)
5. Dynamic theme switching: Need runtime CSS var reading (LOW PRIORITY)
6. Code-split maplibre: 1.02 MB chunk (PERFORMANCE, not blocking)
7. No auth on POST /api/businesses (LobsterID is real fix, rate-limit is stopgap)
8. OSM graph extraction: `npm run extract:osm` never run on Render
9. 4 npm audit moderates: drizzle-kit (build-time, low urgency)

---

## Technical Debt (Not Urgent)

- MapTiler key: Move from hardcoded to Render env var when dashboard access available
- `npm run extract:osm` never run on Render (router has no graph yet)
- Privacy stack: compiles but nothing calls EphemeralProcessor, k-anonymity yet
- Sketchfab landmark model IDs: must re-verify before implementation

---

## Previous Session State (Sep 21)

MapTiler proxy and M3 accessibility work — all documented above.
Render deployment auto-triggers on push. Code committed and tested locally.
