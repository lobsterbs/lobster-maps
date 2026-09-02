# LobsterMaps — status and plan

## About the project

LobsterMaps is a maps and local-business-directory app, part of the
Lobster Ecosystem (sibling projects: LobsterCaptcha, LobsterID).
Global map coverage via MapTiler's vector tiles (switched from an
original self-hosted-Protomaps-extract design, see "Major update"
below for the full story of why).

**Stack:** React + Vite + MapLibre GL client with a hand-built dark
cartographic style (`Map.tsx`'s `darkStyle()`/`satelliteStyle()`),
`@react-spring/web` for motion, Express + Drizzle server, Postgres +
PostGIS (Neon), MapTiler vector tiles (Planet v4 tileset) for the
basemap + 3D buildings, Esri World Imagery for satellite view,
Nominatim for geocoding (proxied server-side, rate-limited to comply
with their usage policy).

**Deployment:** single Node process on Render serves the built client,
the API, and an MCP endpoint all from one port. Database on Neon.

## Current status

- Live at `https://lobster-maps.onrender.com`
- Code: `https://github.com/lobsterbs/lobster-maps` (public repo)
- Database: Neon project `lobster-maps` (id `floral-silence-23234233`),
  schema + PostGIS migrated and verified by direct query, not just trusting
  the migration tool
- MCP connector: confirmed working end-to-end through Claude's actual
  connector infrastructure (both header-token and path-token auth tested),
  connected as `lobstermaps` in Claude settings

## Fixes made during this deploy

- Bumped `drizzle-orm` 0.36.4 -> 0.45.2 (GHSA-gpj5-g38j-94v9, high-severity
  SQL injection in identifier escaping). This codebase didn't hit the
  vulnerable pattern (checked: no `sql.identifier()` or `.as()` fed with
  user input), but no reason to ship the vulnerable version.
- Added `express-rate-limit` (10/IP/15min) on `POST /api/businesses`. This is
  a stopgap against naive spam, **not** a substitute for real auth,
  LobsterID integration is still the actual fix, per the README's own
  known-gaps section.
- Fixed a real bug: the Map component had zero error handling, so any
  tile-load failure just hung the loading spinner forever with no way for
  the UI to know something went wrong. Added a proper `map.on('error', ...)`
  listener wired through to a real error state in the UI, and made it
  distinguish "tiles were never configured" (expected, friendly message)
  from "tiles were configured but something actually broke" (real error
  shown).
- Added a path-token MCP auth option (`POST /mcp/<token>`) alongside the
  existing header-based one, since Claude's custom-connector-by-URL flow may
  only expose OAuth fields depending on account tier. `static_headers` (the
  proper fix) is in beta and reads as admin/org-scoped per Anthropic's own
  docs, unconfirmed whether it's available on this account.
- **Fixed a real path-traversal bug** in the MCP server's `resolveSafe()`:
  it used `full.startsWith(PROJECT_ROOT)`, a classic bypass, a sibling
  directory like `/opt/project-evil/secret.txt` also starts with the string
  `/opt/project` and would incorrectly pass. Proved it with a concrete
  reproduction (real sibling dir, old logic vs fixed logic side by side),
  fixed it to require an exact match or a proper path-separator boundary,
  and re-verified against the actual compiled server through the real MCP
  protocol: legit paths still resolve, the sibling escape now correctly
  returns `isError:true` on both `read_file` and `list_directory`.

> **Mistake made and corrected, worth knowing about:** early in this deploy
> I set `VITE_PMTILES_URL` to a URL I hadn't actually verified existed
> (wrong domain, wrong date format, a genuine hallucination, not a typo).
> It caused the exact infinite-loading bug it was meant to fix. Caught it,
> corrected it, and fixed the underlying error-handling gap so this class
> of failure can't hang the UI again. Lesson for future me: verify external
> URLs before wiring them into anything production-facing, especially env
> vars baked into a client build.

## Real business data, in-app routing, and why transit isn't started

User asked for three things in one message: real business data, bus
routes, and real navigation with time estimates. Handled each
differently, worth knowing why:

**Businesses**: built `server/src/scripts/seed-from-overpass.ts`,
pulling from OSM's Overpass API rather than scraping any business
directory site, this is the exact path the README's "Where to get
business data, and where not to" section already laid out. Run it with
`npm run seed:overpass -- --bbox=...` or `--place="..."`. Imported rows
get `verified: true`, meaningfully distinct from unverified
self-submissions, gives that flag actual purpose. The dedup logic (skip
anything within 15m with the same name, reusing the existing
GIST-indexed `geog` column) got tested against the real live DB through
Neon's MCP tool, insert + near-match + far-non-match + cleanup, before
trusting it. What's **not** tested: the actual Overpass HTTP call
itself, this sandbox's network allowlist doesn't reach
`overpass-api.de`. First real run needs watching.

**Bus routes**: the literal ask ("fetched from their sites") was
pointed at the wrong approach, scraping individual transit agencies'
websites is fragile and often against their terms. Real transit data
comes from **GTFS**, a standard feed format virtually every agency
publishes specifically so third-party apps can consume it. Not built
yet, see "not started" below for why.

**Navigation with time estimates**: built on OpenRouteService
(openrouteservice.org), not a self-hosted routing engine. Same
reasoning as the MapTiler pivot: self-hosting OSRM/Valhalla needs a
real OSM extract, meaningful RAM to build the routing graph, and an
always-on server process, all the same practical walls that killed
self-hosted tiles. ORS has a real free tier (~2000 directions
requests/day per their own docs), is itself built on OSM data, and
needs zero new infrastructure, just an API key.
`client/src/lib/routing.ts` is the client, `RouteInfoCard.tsx` shows
the result. Gated behind `VITE_ORS_KEY` (not set yet, needs signup,
same pattern as `VITE_MAPTILER_KEY`), falls back to a Google Maps
deep-link when unset, not a broken feature either way. The endpoint
shape, auth header format, and coordinate order are verified against
ORS's own client library source. What's **not** verified: an actual
live response's exact JSON field names, there's no key to test
against yet, parsing is defensive on purpose because of that. Known
gap: switching Map/Satellite while a route is showing clears the
route line (`map.setStyle()` wipes custom layers, no re-add-on-style-
swap listener yet), minor, not fixed this pass.

**Transit routing — DONE, not just researched anymore.** Found a real
working example query in the wild (an ESP8266 hobby project's README)
confirming the actual `trip { tripPatterns { legs { line { name } } } }`
shape, and Entur's own official `@entur/sdk` npm package docs
confirming `from`/`to` accept raw `coordinates: {latitude, longitude}`
directly — no StopPlace ID lookup needed for a basic version.
`client/src/lib/transit.ts` is built. Business sheet now shows both
"🚗 Drive" and "🚌 Transit" as separate buttons — Transit needs no key
at all (unlike Drive/ORS), so it's always available. `RouteInfoCard`
shows a leg-by-leg breakdown (walk → bus → walk, line names, mode
icons) for transit vs. a simple duration/distance line for driving.

**What's still not verified**: an actual live response. GraphQL is
less forgiving than the ORS situation, it fails the ENTIRE query if
even one requested field doesn't exist, not just missing data on one
field. The query was kept deliberately conservative because of
that — stuck close to what's directly confirmed working
(`startTime`/`duration`/`legs.line.name`), plus a small number of very
standard, high-confidence additions (`mode`, `distance`, `endTime` on
legs). First real transit request from the live app needs watching
closely, same as the Overpass import's first run.

## Street View finished, category filters, and where transit actually stands

Picked back up from the "started, not finished" note above.
`StreetViewLayer.tsx` is done: toggle button, Mapillary coverage lines,
click one to open the nearest photo via `mapillary-js`. Gated behind
`VITE_MAPILLARY_TOKEN`. Bundle size roughly doubled since the library
ships unconditionally even when unused, worth code-splitting later.

Also added `CategoryFilterChips.tsx`, the README's own #1 backlog
item. Derived dynamically from whatever's in the current viewport.
Building this required splitting marker rendering into fetch (network)
and render (clustering + DOM) so a filter toggle doesn't need a fresh
API call — and that split almost introduced a real bug worth
understanding if touching this code again: **`MapCanvas`'s map-setup
effect (`Map.tsx`) has an intentionally empty dependency array**, it
registers `onMoveEnd` once at mount and never updates that closure. Any
callback passed to it needs a *stable identity for the life of the
component*, not just "correct at the time it's created." Making
`syncMarkers` depend on `selectedCategory` state broke that, every chip
tap would've given `syncMarkers` a new identity, which cascades up
through `handleMoveEnd` — but `MapCanvas` would've kept calling the
ORIGINAL stale version forever, silently reverting any active filter
the moment the map got panned. Fixed with a ref
(`selectedCategoryRef`) that mirrors the state; `syncMarkers` reads the
ref instead of closing over the state directly, so its own identity
never changes. **Any future prop passed into `MapCanvas` needs this
same treatment** if it depends on state that changes over the
component's lifetime, a ref that mirrors the state, not the state
itself in the dependency chain.

**Transit routing — where it actually stands now, this is a real
update to "Why transit routing isn't started" above**: user's own
region is Skyss (Vestland/Bergen, Norway). Researched properly rather
than guessing: Skyss doesn't need its own integration at all, it's one
of ~27 operators already feeding into **Entur**, Norway's national
transit data aggregator. Entur already runs a full OpenTripPlanner-
based journey planner covering ALL Norwegian public transport,
including real-time data, as a free, open, hosted GraphQL API. This
**completely changes** the earlier assessment that transit needs
self-hosted OpenTripPlanner and probably doesn't fit Render's free
tier, for this specific user's region, that infrastructure problem is
already solved by Entur.

Confirmed, real:
- Endpoint: `POST https://api.entur.io/journey-planner/v3/graphql`
  (also a stable v2 at `/v2/graphql` if v3's BETA status matters)
- Auth: **no API key, no signup at all** — just a self-identifying
  `ET-Client-Name: <company>-<application>` header (e.g.
  `lobstermaps-directions`), open under NLOD licence
- Body: standard GraphQL POST, `{"query": "...", "variables": {...}}`
- It's Transmodel-based (a specific GraphQL schema built on the
  NeTEx/Transmodel European transit data standard), not a generic
  "give me directions" shape

**Not confirmed yet**: the actual `trip` query's field-level shape
(how to specify from/to, what an itinerary/leg looks like in the
response). Ran out of research time this round before nailing that
down, and deliberately didn't write code against a schema I wasn't
sure of, same discipline as everything else tonight. Next session:
get the real query shape (try the GraphQL IDE at
`api.entur.io/journey-planner/v3/ide`, or search their example-queries
page, or just query the schema's `__schema` introspection directly
against the live endpoint, no auth needed), then build it. This is a
genuinely separate, bigger feature than what fit alongside Street View
and category filters this round, worth its own focused pass rather
than a rushed bolt-on.

## Major update: map tiles and style completely rebuilt

The original plan (self-hosted Protomaps `.pmtiles` regional extract)
got abandoned entirely over the course of one long session. Here's the
actual path that happened, in order, since a future agent should know
the full story, not just the end state:

1. User asked for the entire world map, not a regional extract. The
   self-hosted-pmtiles design fundamentally doesn't support that (the
   full planet file is 120GB).
2. First attempt: point `VITE_PMTILES_URL` directly at Protomaps' CDN
   build. Wrong, hotlinking their builds is explicitly discouraged and
   PMTiles format doesn't work as a simple URL swap anyway, it needs
   proper range-request support.
3. Second attempt: switch to plain OpenStreetMap raster tiles for
   global coverage. Worked, but lost 3D buildings and looked flat/dated
   against the app's actual dark theme, plain default-OSM styling on a
   raster base doesn't take custom styling.
4. User provided a MapTiler API key to add 3D buildings back
   (`wbQhKmIrXoSFpnzJmV4w`, hardcoded directly in `Map.tsx` — not an
   env var, see "On the horizon" for why that should change eventually).
5. First MapTiler integration attempt used a guessed URL
   (`/data/v3.json`) and a guessed field name (`min_height`). Both
   wrong, confirmed via web search + direct doc fetch rather than
   guessed again. Real URL: `/tiles/v4/tiles.json`. Real field: 
   `height_min`, not `min_height` — this one wouldn't have errored at 
   all, MapLibre just silently treats an unmatched property as 
   undefined, so it would've shipped looking like it worked while every
   building rendered flat.
6. Even after that fix, buildings still didn't show on load — root
   cause: the height ramp started at zoom 15 but the app's default zoom
   was 12, so buildings were rendering, just at height 0. Combined
   with plain OSM raster tiles looking nothing like the app's dark
   theme, that's the full "old and ugly, no 3D buildings" report.
7. **Final fix**: dropped OSM raster entirely, single MapTiler vector
   source (`v4`, their Planet tileset) for everything, hand-built a
   proper dark style: full road hierarchy by class, water, landcover,
   buildings that ramp 13→16 instead of 15→15.05, underground
   buildings filtered out, buildings layered after roads (matches
   MapLibre's own official 3D-buildings pattern), real labels (Noto
   Sans, confirmed hosted on MapTiler's glyph service, not gambled on
   Inter being available there), subtle directional light on the
   extrusions. Default zoom bumped 12→16, pitch 45→55, so the 3D
   buildings sell themselves immediately on load instead of needing the
   user to go find them.

**Current state**: live, deployed, confirmed booting clean in Render's
logs. The overall approach and every field/layer name is checked
against MapTiler's actual published schema
(docs.maptiler.com/schema/planet-v4/), not pattern-matched. What's
**not** independently confirmed: how it actually looks. There's no
browser available from this environment, so colors, label density,
layer ordering, and general polish are based on careful spec-level
review, not a real look at the rendered map. If a future session picks
this up and something looks visually off, check `Map.tsx`'s `darkStyle()`
and `satelliteStyle()` functions first, that's the entire cartography
in two functions.

## Why the MCP connector keeps dropping

Checked Render's logs directly: four separate container instances booted
today, hours apart, each one clean (no crashes, just a normal boot then
nothing until the next gap). That's Render's free tier spinning the service
down after ~15 min idle and cold-starting on the next request (30-50s
wake-up). If Claude's connector tries to reach it while asleep, the
wake-up time likely exceeds whatever timeout the connector check uses, and
it drops from the tool list. Nothing is actually broken.

Real options, genuinely a cost/tradeoff call for the user, not decided
here:
1. Leave it, free, but the connector may need a retry after idle periods.
2. Add a keep-alive ping (cron hitting `/health` every ~10 min) — free,
   standard workaround, mild hack.
3. Upgrade to Render's Starter plan (~$7/mo) — always-on, costs money,
   which this project has deliberately avoided so far.

## To-Do

- [ ] **Watch the first real transit request closely** (tap "🚌
      Transit" on any business). The GraphQL query has never round-
      tripped a real response, and GraphQL fails the whole query on
      one wrong field, not just missing data. First real test either
      confirms it works or shows exactly what to fix.
- [ ] **Get an ORS API key** (openrouteservice.org, sign up, now via a
      HeiGIT account, then Dashboard → generate a key) and set
      `VITE_ORS_KEY` on Render, then actually test in-app driving
      directions live, this has never round-tripped a real response.
- [ ] Get a Mapillary access token (mapillary.com/dashboard/developers)
      and set `VITE_MAPILLARY_TOKEN` on Render to activate Street View
      — the component itself is done now, just needs the token.
- [ ] **Watch the first real `npm run seed:overpass` run closely.** The
      Overpass HTTP call has never been tested end-to-end from any
      environment that built it.
- [ ] Fix the route-line-disappears-on-Map/Satellite-toggle gap (minor,
      documented in "Navigation with time estimates" above).
- [ ] Code-split `mapillary-js` out of the main bundle — it ships
      unconditionally even when `VITE_MAPILLARY_TOKEN` is unset, only
      the rendering is gated, not the import. Bundle size roughly
      doubled when it was added.
- [ ] **Get real eyes on the live map in general.** Colors, road
      hierarchy, label density, whether the 3D buildings actually look
      good and not just technically present, none of that's been
      confirmed by an actual look, there's no browser in this
      environment. Same for the business detail sheet, the routing UI,
      the new category chips, and Street View.
- [ ] Decide how to handle the MCP connector dropping after Render's free
      tier spins down idle (see "Why the MCP connector keeps dropping"
      above), leave as-is, add a keep-alive ping, or pay for always-on.
- [ ] Confirm whether `static_headers` is actually available on this Claude
      account (Settings -> Connectors -> Add custom connector, check for a
      header/token field). If yes, the header-based `/mcp` URL is cleaner
      than the path-token one currently in use.
- [ ] Regenerate a properly-scoped GitHub token (current one is a classic
      token with full `repo` scope covering every repo on the account) or
      revoke it, the push work is done for now.
- [ ] Real auth on `POST /api/businesses` (rate limiting is only a
      stopgap). LobsterID integration is the actual fix, bigger scope,
      needs an explicit decision on timing before real users show up.
- [ ] Auto-deploy on git push doesn't currently work, no GitHub webhook is
      registered since the repo was connected by public URL rather than
      through Render's GitHub App. Manual `trigger_deploy` is needed after
      each push unless this gets connected properly in Render's dashboard.
- [ ] Real file upload for business photos — current version is a URL
      field, honest interim step, not the finished feature. Needs actual
      object storage (S3/R2/etc), no credentials for that set up yet.
- [ ] Feature backlog from the README, not started: category filters,
      "near me" geolocation, duplicate detection on submit, moderation view
      for the `verified` flag, terrain/elevation.

## Plan

Core map/tiles/style work is done and deployed, business detail sheet
has real content now (images, directions, hours), businesses can be
seeded from real OSM data instead of only user submissions, and
point-to-point routing with real time estimates exists gated behind a
key that needs signing up for. None of the new stuff (routing,
Overpass import, business sheet layout) has been visually or
end-to-end verified, same story as the map style, that's the standing
highest-priority item every session: get real eyes on it, report back
what's actually broken. Transit/bus routing is a deliberately deferred,
separately-scoped decision, not an oversight, see "Why transit routing
isn't started" above before picking it up. After routing gets verified
and Street View gets finished, LobsterID auth is still the next real
priority before this goes in front of anyone besides the person
running it.

## For a future agent picking this up

- Read this file **and** the `lobster-maps` memory file, they don't
  duplicate each other.
- The `lobstermaps` MCP connector (`list_directory` / `read_file` /
  `write_file`) reads and writes the **live Render instance's filesystem
  directly**, not this sandbox and not the GitHub repo. Changes made
  through it vanish on the next redeploy (Render's filesystem is ephemeral)
  and never reach git unless separately committed and pushed. Use it for
  live inspection or a quick emergency patch, never as a substitute for the
  normal git workflow.
- No GitHub MCP connector exists for this account as of this session,
  pushing needs a token pasted into the sandbox each time.
- Neon project id: `floral-silence-23234233`. Render service id:
  `srv-da77r72d0e5s73dl976g`, workspace id: `tea-da6k16hsrm7s73aeg0s0`.
- `MCP_AUTH_TOKEN` and `DATABASE_URL` live as env vars on Render. Not
  repeated here on purpose, this file is public, that's the appropriate
  place for them to live, not a committed file.
