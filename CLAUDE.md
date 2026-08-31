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

- [ ] **Get real eyes on the live map.** Everything about the new style
      (colors, road hierarchy, label density, whether the 3D buildings
      actually look good and not just technically present) is based on
      spec-level review, not a real look, there's no browser available
      from this environment. This is the single highest-value thing a
      human or a session with actual visual verification can do.
- [ ] Move the MapTiler key (`wbQhKmIrXoSFpnzJmV4w`, hardcoded in
      `Map.tsx`) to an env var (`VITE_MAPTILER_KEY`), same reasoning as
      the original `.env.example` files, secrets shouldn't sit directly
      in committed source even for a free-tier key.
- [ ] Remove now-unused dependencies from `client/package.json`:
      `pmtiles` and `@protomaps/basemaps` are no longer imported
      anywhere (confirmed via grep) since the switch away from
      self-hosted tiles. Not bundled either way since nothing imports
      them, but worth cleaning up the manifest.
- [ ] `README.md` still describes the old self-hosted Protomaps/pmtiles
      architecture in detail (Tiles section, deployment steps
      referencing `VITE_PMTILES_URL`, "Why not Apple/Google Maps"
      section). All of it is now inaccurate and needs a rewrite to
      match the actual MapTiler-based setup.
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
- [ ] Feature backlog from the README, not started: category filters,
      "near me" geolocation, duplicate detection on submit, moderation view
      for the `verified` flag, directions/routing, terrain/elevation.

## Plan

Map/tiles/style is functionally done and deployed. What's left there is
verification, not more building, someone needs to actually look at it
and report back what's wrong, the same way the last two rounds of bugs
got found ("map didn't load" → wrong URL, "no 3D buildings" → wrong
zoom math). Once it visually checks out, move the API key to an env
var and clean up the README, both are quick. After that, LobsterID auth
is the next real priority before this goes in front of anyone besides
the person running it.

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
