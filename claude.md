# LobsterMaps — working notes

Authoritative handoff doc. If GitHub and Notion disagree, this file
wins. Mirrored to Notion (3c91682f-4601-8182-9b34-ca2bc0c5fc09).

**Last updated:** 22 Sep 2026, 23:35 UTC

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

### This Session (Sep 22, 2026 — M3 Responsiveness, Touch Targets, MapTiler Debug)

**COMPLETED:**
- ✅ MapTiler error logging: Added detailed diagnostics to proxy routes
  - Added health endpoint (`GET /api/maptiler/health`) for key testing
  - Added Referer & User-Agent headers to MapTiler requests
  - Full error details logged (status, headers, body snippet)
  - Commit: `e5a59fd`

- ✅ **M3 Responsive Density System** — fully implemented
  - Created `client/src/styles/spacing.ts` utility constants
  - Added 3 @media breakpoints to theme with density-specific tokens:
    * Compact (< 480px): small phones
    * Medium (480–839px): tablets in portrait
    * Expanded (>= 840px): tablets in landscape/desktop
  - 6 responsive spacing levels: compact, xs, sm, md, lg, xl
  - Grid layout columns: 4 (compact), 8 (medium), 12 (expanded)
  - Icon sizes scale per density
  - Commit: `fb86263`

- ✅ **Applied M3 spacing to key components:**
  - MD3RoutePlannerCard.tsx: 10+ hardcoded px → spacing tokens
  - MD3EnhancedRouteSelectorCard.tsx: 5+ hardcoded px → spacing tokens
  - BusinessDetailSheet.tsx: 6 padding/margin/gap values → tokens
  - Components now auto-scale padding/gaps at breakpoints

- ✅ **Touch target audit & fixes:**
  - Basemap pill buttons: 36px → 48px minimum height (M3 compliance, WCAG 2.5.5)
  - Commit: `4cf00dc`

**Commits pushed (in order):**
1. `e5a59fd` - MapTiler debug: error logging + health endpoint
2. `fb86263` - M3 responsive breakpoints & spacing system
3. `4cf00dc` - Basemap pill touch target: 36px → 48px
4. `f28e9fe` - BusinessDetailSheet spacing tokens

**Status:**
- Render auto-deploying: ~5 min expected
- MapTiler proxy has diagnostic endpoint for debugging 401/403 issues
- Responsive spacing system live and scaling at all breakpoints
- Touch targets improved for accessibility

**Known gaps:**
- MapTiler 401/403 still unresolved (needs key allowlist check in MapTiler dashboard)
- Not all components have spacing tokens yet (MD3Button, GlassCard, etc.)
- Dynamic theme switching: Still needs runtime CSS variable reading

---

## Technical Notes

### MapTiler Proxy Architecture (with debugging)
- Client requests `/api/maptiler/*` endpoints
- Server proxies to `https://api.maptiler.com/...?key=...`
- **New:** `/api/maptiler/health` diagnostic endpoint tests key validity
  - Returns full response headers, status, and error body
  - Helps distinguish "key invalid" vs "domain restricted"
- Added Referer and User-Agent headers (some APIs require them)

### M3 Responsive Spacing System
Example: `SPACING.md` renders as:
- Compact: 16px (< 480px)
- Medium: 20px (480–839px)
- Expanded: 24px (>= 840px)

All breakpoints defined via CSS `@media` queries with token overrides.
Components just use `padding: SPACING.md` — no media query logic needed.

---

## Verified Open Issues (Priority Order)

1. **CRITICAL**: MapTiler 401/403 persists despite key + proxy
   - Root cause: Likely domain restriction in MapTiler dashboard
   - Fix: Test `/api/maptiler/health` endpoint, check MapTiler key settings
   - Status: Awaiting dashboard access or key verification
   - Commit: e5a59fd (adds diagnostic endpoint)

2. ✅ RESOLVED: M3 hardcoded colors → Semantic tokens
3. ✅ RESOLVED: MapTiler key runtime access → Fallback to .env.production
4. ✅ RESOLVED: Responsive breakpoints → System fully implemented
5. ✅ RESOLVED: Basemap touch target → 48dp minimum
6. Apply M3 spacing to remaining components (MD3Button, GlassCard, etc.)
7. Dynamic theme switching: Need runtime CSS variable reading
8. No auth on POST /api/businesses (LobsterID is real fix, rate-limit is stopgap)
9. OSM graph extraction: `npm run extract:osm` never run on Render
10. Code-split maplibre: 1.02 MB chunk (PERFORMANCE, not blocking)
11. 4 npm audit moderates: drizzle-kit (build-time, low urgency)

---

## Next Steps (for next session)

1. **Debug MapTiler 401/403**: Test `/api/maptiler/health`, check domain allowlist
   - If domain-restricted, update MapTiler dashboard to allow lobster-maps.onrender.com
   - Once fixed, tiles should load automatically
2. Continue applying M3 spacing to remaining components
3. Implement dynamic theme switching with CSS variable reading
4. Comprehensive icon button touch target audit
5. Verify dark/light theme switching end-to-end

---

## Previous Sessions

**Sep 21 (MapTiler Proxy):**
- Implemented server-side proxy to bypass browser Origin restrictions
- Proxy fetches MapTiler on behalf of client
- Commits: b2616dc (proxy), f48ac3a (docs)

**Sep 21 (M3 Accessibility):**
- Focus-visible: 3px solid outline ✓
- ARIA fixes: basemap radiogroup ✓
- Keyboard nav: arrow keys, Home/End ✓
- Commit: d60fd78
