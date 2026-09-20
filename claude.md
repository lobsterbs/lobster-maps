# LobsterMaps — working notes

Authoritative handoff doc. If GitHub and Notion disagree with each
other, this file wins. Mirrored to Notion
(3c91682f-4601-8182-9b34-ca2bc0c5fc09).

**Last updated:** 20 Sep 2026

---

## About the project

Privacy-first maps, navigation and local business directory for
Bergen / Vestland, Norway. Part of the Lobster Ecosystem (hobby, not
commercial). AGPL-3.0.

- Live: https://lobster-maps.onrender.com
- Repo: https://github.com/lobsterbs/lobster-maps
- Monorepo: `client/` (React + Vite + MapLibre GL v6), `server/`
  (Express + Drizzle), `routing-core/` (Rust/WASM, optional)
- DB: Neon Postgres + PostGIS, project `floral-silence-23234233`
- Host: Render, service `srv-da77r72d0e5s73dl976g`,
  workspace `tea-da6k16hsrm7s73aeg0s0`
- Design: Material Design 3, emerald `#10b981`, Google Sans Flex
- Data: MapTiler (basemaps, terrain), OSM/Overpass (businesses),
  Nominatim (geocoding), Entur (transit), Yr.no (weather),
  Mapillary (street-level imagery)

### Hard-won constraints — read before changing these

- **Build locally before every push.** `npm run build:client && npm run
  build:server`. Non-negotiable; it has caught broken deploys before.
- Neon's Postgres port is unreachable from the sandbox. All DB work goes
  through the Neon MCP, **one SQL statement per call** — multi-statement
  batches fail silently.
- Render auto-deploy is unreliable here; trigger deploys explicitly.
- The custom A* router stays. ORS is a data source feeding it, not a
  replacement.
- No scraping Yelp / Google Places / TripAdvisor. Overpass, government
  open data and Wikidata are the sanctioned sources.
- `VITE_*` vars are inlined at **build** time. Setting one on Render
  without rebuilding does nothing.

---

## Current task — status

**Done and pushed (commit `98f9bc9`).** MapTiler overhaul + bug sweep.

### MapTiler: what changed and why

The client no longer hand-builds a basemap style. It fetches MapTiler's
published style JSON:

```
https://api.maptiler.com/maps/{mapId}/style.json?key=...
```

The old code called `https://api.maptiler.com/tiles/v4/tiles.json`. The
`/maps/{id}/style.json` form is the current one, and MapTiler's own
client marks the entire `*-v2` style generation deprecated in favour of
`*-v4`. Every ID below was read out of `@maptiler/client`'s
`MAP_STYLE_CONFIG` or docs.maptiler.com — none are guessed.

Basemaps wired into the switcher (`client/src/lib/maptiler.ts`):
`streets-v4-dark` (default), `streets-v4`, `outdoor-v4-dark`,
`topo-v4`, `hybrid-v4`, `winter-v4`, `ocean-v4`.

3D terrain uses the `terrain-rgb-v2` raster-DEM tileset
(`/tiles/terrain-rgb-v2/tiles.json`, max zoom 14), toggled from the
map controls, with a sky layer so a pitched view has a horizon.

**Architecture decision — tiles go direct, not through Render.** The
old `/api/maptiler/*` proxy is deleted. It did not hide the key (a
MapTiler style.json embeds key-bearing absolute URLs for its own
sources, sprites and glyphs, so the browser held the key anyway), and
it routed every tile from a Norwegian user through a US Render box.
The browser now hits MapTiler's CDN directly.

**This means the key must be locked down in MapTiler's dashboard**, not
in our code: Account → API Keys → Edit → restrict to allowed origins
(`https://lobster-maps.onrender.com`, `http://localhost:5173`). That is
the control MapTiler provides for browser keys. **Not yet done — see
To-Do.**

### Bugs fixed this session

| # | Bug | Impact |
|---|-----|--------|
| 1 | `/api/tiles` shared a 100-token bucket with the JSON API | One map pan = 30-60 tiles = bucket drained = next real API call 429s. Looked exactly like "map broken". Buckets now isolated per purpose |
| 2 | Every MapLibre `error` treated as fatal | A single missing tile replaced a working map with a full-screen failure state. Only pre-load errors are fatal now; 401/403 names the real cause |
| 3 | `attributionControl: false` | MapTiler and OSM both require attribution. Restored as a compact control |
| 4 | Basemap switch wiped the drawn route | `setStyle()` destroys all sources. Route geometry is kept and redrawn via a new `onStyleReload` callback |
| 5 | Bare Esri World Imagery REST endpoint | Not licensed outside ArcGIS Online without an account. Replaced with `hybrid-v4` |
| 6 | `mapbox3dTerrain.ts` / `mapbox3dBuildings.ts` / `terrainColors.ts` | Dead and unusable — referenced `mapbox://mapbox.mapbox-terrain-dem-v1` and a Mapbox `composite` source, neither of which exists in MapLibre. Deleted |
| 7 | 62 orphaned duplicate source files at repo root | Stale copies of `client/`+`server/` files. Root `Map.tsx` had already drifted from the real one, so anyone editing it changed nothing. Removed |

---

## Information for continuing in a new conversation

- Map code lives in `client/src/components/Map.tsx` and
  `client/src/lib/maptiler.ts`. **All MapTiler IDs and URL shapes belong
  in the lib file**, with the source they were verified against in a
  comment. Do not inline a MapTiler URL anywhere else.
- Rate limiting is `server/src/middleware/rateLimiterWasm.ts`. It now
  exports `createRateLimiterMiddleware(opts)` plus two instances:
  `rateLimiterWasm` (strict, JSON API) and `tileRateLimiter` (bursty,
  tiles). In `server/src/index.ts` the strict one explicitly skips
  `/tiles/` because `/api/tiles/...` matches both mounts.
- WASM is **not actually running in production**. Render logs say
  `WASM modules not found (routing-core/pkg missing)` and everything
  falls back to Node. The version badge still says `v2.0.0-wasm`, which
  is misleading.
- The keyless path still works: no `VITE_MAPTILER_KEY` at build time →
  proxied OSM raster via `/api/tiles/{z}/{x}/{y}.png`. Flat, no terrain,
  no switcher. Deliberately plain so a missing key is obvious.
- Render deploys: set env vars **first**, then push, then trigger.
- Git push pattern:
  `git -c credential.helper='!f() { echo "username=x-access-token"; echo "password=$GH_TOKEN"; }; f' push origin main`
  PAT never goes in a file.

---

## To-Do

### Blocking / do first
1. **Restrict the MapTiler key to allowed origins** in the MapTiler
   dashboard. Until then the key in the bundle is usable by anyone.
2. **Verify the live map** after deploy: basemap switcher cycles all 7
   styles, terrain toggle raises the mountains, attribution disc shows,
   no 429s in the network tab.

### High
3. Hardcoded hex colours in 20+ components (`SearchBarEnhanced`,
   `PlaceDetailSheet`, `DirectionsPanel`, `TripPlanner`, …) bypass the
   M3 token system, so light/dark theming cannot work. Map to
   `--md-sys-color-*`.
4. No `@media (prefers-reduced-motion)` anywhere. WCAG issue, and this
   app is heavy on spring animation.
5. M3 state layers use Tailwind-era opacities (40%/50%) instead of the
   M3 spec (8%/12%/16%) in `MD3Button`.
6. Code-split `mapillary` (1.05 MB) — it is in the initial bundle even
   when no Mapillary token is configured and the feature cannot run.
   Dynamic `import()` behind the Street View toggle.
7. Decide on WASM: either build `routing-core/pkg` in CI, or stop
   claiming WASM in logs and the version badge.
8. No auth on `POST /api/businesses`. LobsterID is the real fix.
9. `npm audit` on server: 9 vulnerabilities (8 moderate, 1 high).

### Medium
10. 25 internal `.md` reports still committed at repo root, against the
    project's own "only necessary source files" rule. Left in place this
    session because some (PRIVACY_ARCHITECTURE, PHASE2_ROADMAP) may hold
    real design content — decide keep / move to `docs/` / delete.
11. Norwegian map labels. MapTiler Planet v4 carries `name:no`; iterate
    symbol layers after style load and set `text-field` accordingly.
    Cheap win for a Bergen app currently showing English labels.
12. Moderation view for the `verified` flag.

---

## Plan — getting more out of MapTiler

Ordered by value for effort. None of this is started.

1. **MapTiler Geocoding API** (`/geocoding/{query}.json`) alongside or
   instead of Nominatim. Nominatim's usage policy caps us at 1 req/sec,
   which is why search feels sluggish; MapTiler's is built for
   autocomplete and supports country and bbox biasing, so results can be
   weighted to Vestland. Biggest single search-UX win available.
2. **Route elevation profiles.** Terrain RGB is already loaded — use
   MapLibre's terrain elevation query along a route to draw a climb
   profile. Genuinely useful in a city built on hills, and it costs
   almost nothing extra since the DEM tiles are already cached.
3. **Globe projection.** MapLibre v6 supports `setProjection`. Cheap,
   and it looks good at low zoom.
4. **Static Maps API** for share/OG images of a business or a route.
5. **Contours + hillshade** as an outdoor-mode overlay on top of
   `outdoor-v4-dark`.

Suggested skills for the next session: `zero-hallucination-coder` for
anything touching the routing or DB layer, `material-you-web:audit` for
items 3-5 in the To-Do, `a11y-audit` for item 4.
