# LobsterMaps

Self-hosted maps service. OpenStreetMap data throughout, no third-party
map API keys required for tiles. See "Why not Apple/Google Maps" below
before changing that.

## Stack

- **Frontend**: React + Vite, MapLibre GL JS, `@react-spring/web` for motion
- **Map style**: `@protomaps/basemaps`, the official Protomaps style
  generator, real professionally-tuned cartography (road hierarchy,
  labels, parks, water), not a hand-rolled approximation. Only the page
  background is tinted to match Lobster's palette, the rest of the real
  `dark` flavor is left alone on purpose (see below)
- **Loading indicator**: `@alerix/m3-loading-indicator`, a real Apache-2.0
  port of Android's actual `material-components-android` loading
  indicator, genuine Google shape data and spring physics, not an
  approximation. The wavy linear progress bar next to it is hand-built
  (plain sine-wave math, nothing proprietary to port there)
- **Backend**: Express + Drizzle ORM
- **DB**: PostgreSQL + PostGIS (matches LobsterID's Postgres/Drizzle setup)
- **Tiles**: Protomaps `.pmtiles`, self-hosted, extracted from their free
  daily OSM planet builds
- **Geocoding**: Nominatim public API, proxied through the backend with a
  self-enforced 1 req/sec throttle (their usage policy's ceiling)

## Why not Apple/Google Maps

Both Apple's and Google's Maps terms of service explicitly prohibit
scraping, bulk-downloading, or rehosting their tile/map data, and
specifically call out building a "secondary database" from it, which is
exactly what feeding scraped data into our own Postgres table would be.
It's also a losing technical bet: both companies actively detect and
block scrapers, so anything built that way needs constant maintenance
and can vanish without warning. Protomaps gets a comparably clean look
from data we're already allowed to use.

## First-time setup (local development)

### 1. Database

You need Postgres with the PostGIS extension available (most managed
Postgres providers support it; if self-hosting, `postgis/postgis`
Docker image is the easy path).

```bash
cd server
cp .env.example .env   # fill in DATABASE_URL, NOMINATIM_USER_AGENT, MCP_AUTH_TOKEN
npm install
npm run db:migrate     # creates the businesses table via Drizzle
npm run db:postgis     # adds the PostGIS geog column + index
```

`db:postgis` runs `src/db/postgis.sql` through the `pg` package
directly rather than shelling out to the `psql` CLI, which isn't
guaranteed to be preinstalled everywhere (Replit's base image doesn't
have it). Both migration steps are verified against a real local
Postgres + PostGIS instance, including a real insert and the exact
bbox spatial query the API uses, not just checked by reading the SQL.

The `NOMINATIM_USER_AGENT` matters, not just a formality: Nominatim's
usage policy requires a real identifying User-Agent and will drop
requests from generic HTTP client strings.

### 2. Tiles

Build a `.pmtiles` extract for whatever region you actually need (don't
grab the full ~120GB planet file for a hobby project):

```bash
# grab the pmtiles CLI: https://github.com/protomaps/go-pmtiles/releases
pmtiles extract https://build.protomaps.com/<latest-date>.pmtiles region.pmtiles \
  --bbox=<minLng>,<minLat>,<maxLng>,<maxLat>
```

Serve it however's easiest, a static file behind your existing web
server works fine (pmtiles reads via HTTP range requests, no special
tile server needed). Point the client at it:

```bash
# client/.env
VITE_PMTILES_URL=https://your-domain.example/tiles/region.pmtiles
```

The map style shipped in `client/src/components/Map.tsx` uses the real
`@protomaps/basemaps` package's `layers()` generator with the `dark`
flavor, this is Protomaps' own maintained, production-quality basemap:
proper road hierarchy, place labels, parks, water, buildings. Only
`background` is overridden to match Lobster's palette; the rest of the
real dark flavor is intentionally left as-is rather than tinted red,
a map painted entirely in brand color looks garish, not clean. Same
principle Apple Maps itself uses: neutral base map, accent color
reserved for pins and interactive chrome.

### 3D buildings

On by default on the vector map (not on satellite). A `fill-extrusion`
layer reads the real `height`/`min_height` fields already present on
the buildings source-layer (see Protomaps' schema docs), so this is
actual building height data, not a fabricated skyline. Buildings
missing height data fall back to a flat 8m rather than not rendering.
Kicks in at zoom 15+; the map starts pitched 45° so it's visible
immediately rather than requiring the user to tilt manually.

### Satellite imagery

Toggleable (top-right pill), off/disabled until you configure it.
I deliberately didn't hardcode a tile URL here, two real options exist
but neither was a clean "just paste this in" call:

- **EOX Sentinel-2 cloudless** (`s2maps.eu` / `cloudless.eox.at`) —
  CC BY 4.0 for the 2016 vintage, CC BY-NC-SA 4.0 for 2018 onward.
  Explicitly offered by EOX for use as background imagery in
  applications like this one, and Lobster's non-commercial anyway so
  either license works. Caveat: it's a best-effort free service (they
  rate-limit under load, no SLA), and global coverage means lower
  resolution than commercial imagery. I couldn't confirm an exact
  `{z}/{x}/{y}` tile URL template I was fully confident in from their
  docs, check their site directly for the current one rather than
  trust a guess here.
- **Esri World Imagery** — better resolution (1m or better in many
  areas), but per Esri's own community reps, the bare
  `services.arcgisonline.com/.../MapServer/tile/{z}/{y}/{x}` endpoint
  that a lot of tutorials paste around isn't actually licensed for use
  outside ArcGIS Online or OSM editors without an ArcGIS account.
  Sign up for a real ArcGIS Location Platform account (has a free
  tier) if you want this one.

Never Apple's or Google's satellite imagery — identical ToS problem to
their map tiles, see above.

Once you've picked one, set `VITE_SATELLITE_TILES_URL` and
`VITE_SATELLITE_ATTRIBUTION` in `client/.env` and the toggle enables
itself. Satellite mode overlays real place labels from the same
Protomaps vector source on top of the raster imagery (a "hybrid" view)
rather than shipping a bare unlabeled image.

### 3. Run it

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

Client dev server proxies `/api/*` to the backend, so `npm run dev` in
`client/` is all you need day to day.

## Deploying to Render + Neon (free, no card required)

Verified against Render's own current docs while writing this, not
assumed: Render deploys from a **Git repository**, there's no zip
upload for web services, so Git is a required step here that wasn't
needed for Replit. Same single-process shape as above otherwise, one
Build Command, one Start Command, one port.

Render's own managed Postgres isn't part of its free tier (~$7/mo).
**Neon** is the free pairing, genuinely free, no card, and PostGIS is
explicitly supported, confirmed working, not something to fight for.

One real operational note for the MCP connection specifically: Render's
filesystem is ephemeral, wiped on every redeploy/restart. That means if
Claude uses `write_file` or `run_command` through the MCP connection to
edit code live, those edits work fine on the running instance but
**don't get committed back to your Git repo**, and will be wiped the
next time Render redeploys (e.g., after a git push, or a restart).
Treat MCP edits as "live patches to verify," then actually commit
anything you want to keep.

1. **Get four things ready first:**
   - A real `MCP_AUTH_TOKEN` (`openssl rand -hex 32`).
   - A real `NOMINATIM_USER_AGENT`.
   - A real `.pmtiles` file hosted somewhere with a URL.
   - A **Neon** database: create a free account, create a project,
     copy the connection string it gives you, that's your
     `DATABASE_URL`.

2. **Push this project to a GitHub repo** (Render needs to connect to
   one):
   ```bash
   cd lobster-maps
   git init && git add . && git commit -m "Initial commit"
   # create an empty repo on GitHub first, then:
   git remote add origin https://github.com/<you>/lobster-maps.git
   git push -u origin main
   ```

3. **On Render**: New → Web Service → connect that GitHub repo.

4. **Set these fields** in the service creation form:
   - Build Command: `npm run setup`
   - Start Command: `npm start`
   - Instance Type: Free

5. **Set environment variables** (Environment tab, or "Add from .env"
   to paste several at once): `DATABASE_URL` (from Neon),
   `MCP_AUTH_TOKEN`, `NOMINATIM_USER_AGENT`, `VITE_PMTILES_URL`, and
   the satellite two if you're using them. Same build-time nuance as
   before: the `VITE_` ones need to be set before the first build runs,
   not just before the app starts.

6. **Run the migration once**, against the Neon database, from your own
   machine (Render doesn't give you an interactive shell on the free
   tier the way Replit does):
   ```bash
   cd server
   DATABASE_URL="<your Neon connection string>" npm run db:migrate
   DATABASE_URL="<your Neon connection string>" npm run db:postgis
   ```

7. **Deploy.** Render builds and starts it, and gives you a public
   `https://your-service.onrender.com` URL. First request after any
   idle period takes 30-50 seconds to wake up, that's the free tier's
   real trade-off, not a bug.

8. **Connect Claude**: Settings → Connectors → Add custom connector,
   URL is `https://your-service.onrender.com/mcp`, `MCP_AUTH_TOKEN` as
   a bearer header.

## Deploying to Replit, the easy way

This deploys as a single process: the Express server serves the built
frontend, the API, and the MCP endpoint all from one port, so there's
no separate reverse proxy to configure. A root `package.json` has the
three commands that matter: `npm run setup` (install everything and
build everything), `npm run build`, `npm start`.

If you're relaying these steps to Replit Agent yourself rather than
giving it an open-ended brief: good instinct, that's exactly how the
earlier design regression happened, an agent with creative freedom and
no mention of the actual design system reached for its own aesthetic.
Telling it to run exact commands leaves it no room to reinterpret
anything.

1. **Get three things ready first**, before touching Replit:
   - A real `MCP_AUTH_TOKEN` — run `openssl rand -hex 32` locally, save
     the output. This is a master key to `run_command` on your server,
     treat it like a password, not a placeholder.
   - A real `NOMINATIM_USER_AGENT` — your app name plus a real contact,
     per Nominatim's usage policy.
   - A real `.pmtiles` file hosted somewhere with a URL (see "Tiles"
     above). Without this the map renders blank, nothing else in this
     list fixes that.

2. **Create the Repl.** New Repl → Node.js template, then get this
   project's files into it (upload the extracted folder, or push it to
   a GitHub repo first and import from there, whichever's easier for
   you).

3. **Add a database.** Open the Database tool in Replit's Tools panel
   and create one, this is a real, current, one-click feature (verified
   against Replit's own docs while writing this, not assumed from
   memory) — it sets `DATABASE_URL` automatically, you don't need to
   construct or paste a connection string yourself.

4. **Add Secrets** (Tools → Secrets): `MCP_AUTH_TOKEN`,
   `NOMINATIM_USER_AGENT`, `VITE_PMTILES_URL`, and the satellite two if
   you're using them. One real gotcha: the `VITE_`-prefixed ones get
   baked into the frontend at *build* time, not read at runtime like
   the others, so they need to be set before step 5, not just before
   the app starts.

5. **In the Shell tab**, run:
   ```bash
   npm run setup
   npm run db:migrate --prefix server
   npm run db:postgis --prefix server
   ```

6. **Set the run command to `npm start`** and run it (or set up a real
   Deployment — Autoscale or Reserved VM, not a static one, this app
   needs a persistent process — if you want it to stay up rather than
   sleep when idle). Replit gives you a public URL once it's live.

7. **Connect it to Claude.** In Claude, Settings → Connectors → Add
   custom connector, URL is `https://your-repl-url/mcp`, with the
   `MCP_AUTH_TOKEN` as a bearer header. I haven't personally verified
   the exact field layout for custom headers in that settings screen,
   so check when you get there.


## Connecting Claude directly (MCP)

The server exposes an `/mcp` endpoint (`server/src/mcp.ts`) with four
tools — `read_file`, `write_file`, `list_directory`, `run_command` —
so Claude can work on this codebase directly instead of relaying
through pasted logs or a separate coding agent. Verified with live
tests, not just a type-check: no token → 401, wrong token → 401,
correct token → a valid MCP handshake, `tools/list` showing all four
with correct schemas, and an actual `list_directory` call round-tripping
real project data.

**Important distinction**: this is a *custom* MCP connector you host
yourself, not the "Replit" connector from Claude's partner directory.
That one talks to Replit's own Agent/Apps API, using it doesn't bypass
Replit Agent, it *is* Replit Agent. Setup steps (token, deploy, connect)
are in "Deploying to Replit, the easy way" above.

Once connected, Claude reaches the actual deployed code, not a
description of it.

## MT3E fidelity, honestly

- **Loading indicator**: genuinely accurate. Real ported Google shape
  data and spring physics via `@alerix/m3-loading-indicator`, not a
  hand-rolled approximation.
- **Wavy linear progress**: correct by construction, it's a sine wave,
  there's no proprietary spec to be unfaithful to.
- **Motion elsewhere** (FAB press, marker drop-in, cluster pop-in,
  search results dropdown, modal transitions, business detail sheet):
  genuinely spring-driven via `@react-spring/web`, in keeping with
  M3E's actual physics-based motion philosophy.
- **Business detail sheet**: replaced the plain MapLibre `Popup` with a
  proper bottom sheet, spring-driven slide up/down, frosted glass,
  backdrop dim, large soft top corners. Was the one piece of chrome
  that hadn't gotten this treatment.
- **Color and type** (Lobster Red/Gold, Merriweather/Inter): this is
  deliberately Lobster's own brand identity, not Material's structured
  color-role/tonal-palette system or its Display/Headline/Title/Body/Label
  type scale. That's an intentional divergence, not a bug, brands build on
  M3 without adopting Google's default palette all the time, but it means
  this isn't "stock Material" if that's what "fully MD3E" was asking.
- **Shape system** (corner radii on buttons/modals/cards): hand-picked
  pixel values (search bar is a full pill, modal/cards use larger soft
  radii), leaning into M3E's more expressive, rounder shape language,
  but not derived from M3's actual shape token scale.
- **Map cartography**: real Protomaps `dark` flavor, not hand-rolled,
  see "Stack" above. 3D building extrusion uses real height data from
  the same source, not a fabricated skyline.

## Known gaps (scaffold, not a finished product)

- No auth on `POST /api/businesses` yet, anyone can submit. Wire in
  LobsterID before this goes anywhere public.
- No image upload for business listings.
- No admin/moderation view for the `verified` flag, it just sits false
  until something sets it.

Previously listed here and now fixed: the businesses routes had no
error handling around their DB calls, so a database hiccup on any
request crashed the entire process, MCP endpoint and frontend included,
not just that one request. Found by actually running the server against
a bad `DATABASE_URL` and watching it die, not by reading the code.
Fixed with an async-error wrapper forwarding to a global Express error
handler; re-ran the same failure scenario afterward and confirmed the
process now survives and everything else keeps working.

## Feature ideas, roughly in priority order

Marker clustering and the bottom sheet (both used to be items 1 and 2
here) are now built, see "MT3E fidelity" above and "What's new" below.

1. **Category filters + business name search**, separate from the
   address geocoding search bar that's there now.
2. **"Near me"** via the browser Geolocation API.
3. **Duplicate detection on submit** — check for existing businesses
   near the picked point before allowing a new one in, cheap to do
   with the same bbox query the map already uses.
4. **Moderation view** for the `verified` flag and **LobsterID-gated
   submissions** (these two go together, and are really the same gap
   already flagged above).
5. **Directions/routing.** Neither Nominatim nor Protomaps do this,
   it'd mean standing up a separate routing engine (OSRM, Valhalla,
   and GraphHopper are the usual self-hostable options).
6. **Terrain/elevation**, not just building extrusion — a bigger lift
   than what's here now, needs a DEM tile source on top of the vector
   basemap.

## Where to get business data, and where not to

The submission flow already built is the actual sustainable path here,
worth leaning on rather than treating as a placeholder for scraping.
For seeding/enriching it:

- **OSM Overpass API** — OSM already has millions of tagged businesses
  and POIs (`amenity=cafe`, `shop=*`, etc.). Querying Overpass for
  existing OSM data near a point and offering it as "import this as a
  starting point" is legitimate: it's OSM's own public API, and the
  ODbL license explicitly permits this kind of reuse with attribution.
- **Government open-data portals.** Most cities/counties publish
  business license or permit registries as open data, often CC0 or
  similar public-domain terms, specifically meant for exactly this
  kind of reuse.
- **Wikidata** — CC0, decent coverage of notable/chain businesses and
  landmarks, weaker on "the coffee shop on the corner."

What I wouldn't do: scrape Yelp, Google Places, TripAdvisor, or
Facebook Places. Same problem as the Apple Maps thing earlier in this
project, their terms of service prohibit it, and several of them (Yelp
in particular) have actually litigated against scrapers. Their
official APIs exist, but even those typically restrict how long you
can cache or store results and often explicitly prohibit building your
own permanent database from their data, which is exactly the
architecture this project is built around. Official access doesn't
cleanly solve the problem the way it sounds like it would.
