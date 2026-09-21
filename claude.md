# LobsterMaps — working notes

Authoritative handoff doc. If GitHub and Notion disagree, this file
wins. Mirrored to Notion (3c91682f-4601-8182-9b34-ca2bc0c5fc09).

**Last updated:** 21 Sep 2026, 06:10 UTC

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

Everything below is done and pushed. Both builds pass; the Rust is
verified by `cargo check` and by executing the compiled `.wasm` in Node.

**Last deployed:** 39721be (Sep 20, 2026) - OSM extraction fallback added

### MapTiler (earlier this session)

Client no longer hand-builds a basemap. It fetches MapTiler's published
style JSON: `https://api.maptiler.com/maps/{mapId}/style.json?key=...`.
The `*-v2` generation is deprecated in favour of `*-v4` per MapTiler's
own `@maptiler/client` style table — that, not any "Nov 2025 API
change", is the real reason the old endpoint was wrong.

- Basemaps: `streets-v4-dark` (default), `streets-v4`,
  `outdoor-v4-dark`, `topo-v4`, `hybrid-v4`, `winter-v4`, `ocean-v4`
- 3D terrain from the `terrain-rgb-v2` raster-DEM tileset, plus sky
- Labels coalesce `name:no` over `name`, so Bergen uses Bergen's names
- **Tiles go direct to MapTiler's CDN, not through Render.** The old
  proxy never hid the key (a style.json embeds key-bearing absolute
  URLs for its own sources and glyphs) and routed every Norwegian
  user's tiles through a US box. The key is protected by an origin
  restriction in the MapTiler dashboard instead — **done**.
- All MapTiler IDs and URL shapes live in `client/src/lib/maptiler.ts`
  with the source each was verified against. Do not inline one elsewhere.

### WASM — it had never worked

The crate had never compiled, once, ever. The Actions job had run a
single time in September and failed. Everything recorded about "Tier 1
Rust complete, 3/3, 5-100x faster, all tests passing" described code
that did not build. Nine bugs, all fixed:

*Rust (16 compiler errors)* — `graph.rs` never defined `RouteResult`
though three modules imported it from there; `Graph` lacked
`derive(Clone)` while `lib.rs` cloned it; `multicriteria.rs` imported
`RoadType` from `crate::graph` when it defines it itself;
`bidirectional_ch::query_bidirectional()` did not exist; `State` derived
`Eq` holding an `f32`; `ch.rs` passed a `usize` to `.position()`;
`search_scorer.rs` needed `getter_with_clone`; `js_sys` was used and
never declared.

*Build* — `--target bundler` output needs a bundler and could never load
in `node dist/index.js`; now `--target nodejs`. `wasm-opt` rejected its
own input because binaryen defaults to an older feature set than current
rustc emits, fixed with explicit `--enable-bulk-memory` /
`--enable-nontrapping-float-to-int` in package metadata.

*Loader* — imported `pkg/index.js` (wasm-pack names it after the crate:
`lobster_routing.js`); the relative path resolved to
`server/routing-core` in both dev and prod; awaited a `default()` that
does not exist on the nodejs target; required a `SearchScorer` export
that is not a class (scoring ships as free functions), so it would have
rejected a good build; and `allow_request()` returns a **packed u32**
(MSB = allowed, low 31 bits = remaining), not a bool.

*CI* — `Install wasm-pack` had been passing while installing nothing:
rustwasm.org no longer serves that installer and piping a 404 into `sh`
exits 0. Replaced with `cargo install wasm-pack --locked`.

**How it ships:** Render has no Rust toolchain, so the build-wasm
workflow compiles and commits `routing-core/pkg/` (168 KB `.wasm`) back
to the repo, and the deploy picks it up. Check it is live at
`/health` → `wasm.active: true`.

### Everything else fixed this session

| Area | What was wrong |
| --- | --- |
| Rate limiting | `/api/tiles` shared a 100-token bucket with the JSON API; one map pan (30-60 tiles) drained it and 429'd the next real call. Buckets are isolated per purpose now |
| Map errors | Every MapLibre `error` was fatal, so one missing tile replaced a working map with a full-screen failure |
| Attribution | Switched off entirely, which both MapTiler and OSM require. Restored |
| Route persistence | A basemap switch wiped the drawn route; retained and redrawn via `onStyleReload` |
| Satellite | Bare Esri REST endpoint, not licensed outside ArcGIS Online. Now `hybrid-v4` |
| Reduced motion | Absent entirely (WCAG 2.3.3). CSS query **plus** react-spring `Globals.skipAnimation`, since react-spring runs in JS and ignores CSS |
| M3 state layers | `MD3Button` used token names that do not exist, so `rgba(16,185,129, )` was invalid and there was no state layer at all. The 0.08/0.12/0.16 values in the stylesheet were already correct |
| Bundle | `mapillary-js` (1.15 MB) shipped to everyone including users with no token. Now dynamically imported; confirmed out of the initial load graph |
| Privacy stack | `privacy.rs` and `property_tests.rs` were never declared as modules — the documented 5-layer stack compiled to nothing. Declared; `emission_prob` divided f64 by f32 and `generate_decoys` called `rand` which was never a dependency |
| Honesty | Startup logs printed "<1ms / 100x faster / O(1)" from a boolean flag next to a backend that was not loaded. `VersionIndicator` hardcoded `v2.0.0-wasm`. Both now report what `/health` says is actually running |
| Dead code | `mapbox3dTerrain.ts` / `mapbox3dBuildings.ts` / `terrainColors.ts` referenced `mapbox://` and a Mapbox `composite` source — unusable in MapLibre. Deleted |
| Repo | 62 orphaned duplicate source files removed from root; 24 internal reports moved to `docs/` |
| Security | Server `npm audit`: 9 (8 moderate, 1 high) → 4 moderate |

---

## Current Session (Sep 21, 2026 — 22:06 → 23:30 UTC)

**Completed (with solution):**
- ✅ **MapTiler Origin Header Issue RESOLVED** via server-side proxy (commit b2616dc)
  - Root cause: Browser's automatic Origin header constraint on cross-domain requests
  - Solution: Server proxies all MapTiler requests, avoiding browser CORS restrictions
  - New routes: `/api/maptiler/style/{mapId}`, `/api/maptiler/tiles/{tilesId}`, `/api/maptiler/fonts/{fontstack}/{range}.pbf`
  - Client updated to use proxy (with localhost fallback for dev)
  - Caching: 1h for styles, 24h for tiles, 1y for fonts (HTTP Cache-Control headers)
  - Why this works: Servers can set any headers; MapTiler doesn't restrict them
- ✅ Both builds pass after proxy implementation (client + server TypeScript compile)
- ✅ Set VITE_MAPTILER_KEY in Render env vars (inlined at build time)
- ✅ Redesigned basemap switcher: dropdown → horizontal M3 pill buttons
- ✅ **Comprehensive Material Design 3 accessibility audit** (M3_AUDIT.md, 400+ lines)
- ✅ Fixed CRITICAL accessibility issues:
  - Global focus-visible styling (WCAG 2.4.7): 3px solid primary
  - Basemap pills: radiogroup pattern with keyboard navigation
  - Arrow keys (left/right/up/down), Home/End, roving tab index
- ✅ Built and tested locally before push
- ✅ Pushed to GitHub: commits c65d6ff → 747f7b3 → b2616dc

**MapTiler Origin Header Issue — SOLVED (commit b2616dc)**

Problem: Map tiles were timing out with "Key usage restricted" error.

Root cause: Browser's automatic `Origin` header constraint. MapTiler's origin-restriction security feature rejects requests that don't include a valid Origin header, but browsers can't be told by JavaScript what Origin to send — it's hardcoded as the page's own origin. If MapTiler's allowlist doesn't match exactly, the request fails.

Why direct MapTiler access wouldn't work without manual DevTools inspection (which isn't available autonomously):
- Browser sends: `Origin: https://lobster-maps.onrender.com` (automatic)
- MapTiler checks: does this match the allowlist? (Render's allowlist may differ)
- If no match: "Key usage restricted" error, no way to debug from client code

**Solution deployed:** Server-side proxy (commit b2616dc)
- New route `GET /api/maptiler/style/{mapId}` → fetches `https://api.maptiler.com/maps/{mapId}/style.json?key=...`
- New route `GET /api/maptiler/tiles/{tilesId}` → fetches MapTiler's TileJSON
- New route `GET /api/maptiler/fonts/{fontstack}/{range}.pbf` → fetches binary font glyphs
- Client updated to request `/api/maptiler/*` instead of hitting MapTiler directly
- Caching: 1h for styles (Cache-Control), 24h for tiles, 1y for fonts

**Why this works:**
- Server makes the request (not subject to browser CORS/Origin restrictions)
- MapTiler never sees a browser Origin header
- Server can set any headers it wants
- MapTiler's origin-restriction only applies to browser requests; this is server-to-server

**Files changed:**
- `server/src/routes/maptiler.ts` (new, 154 LOC) — proxy implementation
- `server/src/index.ts` — register `/api/maptiler` routes
- `client/src/lib/maptiler.ts` — `styleUrl()` and `tilesUrl()` updated to use proxy (with localhost dev fallback)

---

## To-Do

1. **Wire the privacy stack into the Router.** It compiles now but
   nothing calls it. `EphemeralProcessor`, k-anonymity binning,
   map-matching and decoys are all unreferenced.
2. **`routing-core/pkg/` is committed to the repo.** That is deliberate
   (Render has no Rust) but it means a stale artifact can ship if
   someone edits Rust without letting CI rebuild. If the deploy and the
   Rust ever disagree, distrust the artifact first.
3. 4 remaining `npm audit` moderates, all in `drizzle-kit`, a
   build-time devDependency. Clearing them needs a breaking major bump.
4. Code-split the `maplibre` chunk (1.02 MB) the way mapillary now is —
   harder, since the map is the landing experience.
5. No auth on `POST /api/businesses`. LobsterID is the real fix.
6. **OSM graph extraction** (Sep 20, 2026)
   - [x] extract-osm handles Overpass API unavailability in sandbox
   - [x] Test graph loaded locally (routes work but minimal)
   - [ ] Deploy to Render and trigger real extraction (need outbound access)
   - [ ] Replace test graph with full Bergen/Vestland OSM data
7. Moderation view for the `verified` flag.
8. Close the two CI debug issues (#2, #3) once you have read them.

---

## Plan — getting more out of MapTiler

None started. Ordered by value for effort.

1. **Geocoding API** (`/geocoding/{query}.json`). Nominatim's policy
   caps us at 1 req/sec, which is why search feels sluggish; MapTiler's
   is built for autocomplete and supports country and bbox biasing, so
   results can be weighted to Vestland. Biggest search-UX win available.
2. **Route elevation profiles.** The DEM is already loaded — query
   terrain elevation along a route and draw a climb profile. Nearly
   free, and genuinely useful in a city built on hills.
3. **Globe projection.** MapLibre v6 `setProjection`. Cheap.
4. **Static Maps API** for share/OG images.
5. **Contours + hillshade** as an outdoor-mode overlay.

Suggested skills next session: `zero-hallucination-coder` for routing
or DB work, `a11y-audit` to confirm the reduced-motion fix, and
`material-you-web:audit` for the remaining token drift.
