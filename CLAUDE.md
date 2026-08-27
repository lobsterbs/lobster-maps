# LobsterMaps — status and plan

## About the project

LobsterMaps is a self-hosted maps and local-business-directory app, part of
the Lobster Ecosystem (sibling projects: LobsterCaptcha, LobsterID).
OpenStreetMap data throughout, no Apple/Google Maps (their ToS prohibits
rehosting map data, see README for the full reasoning).

**Stack:** React + Vite + MapLibre GL client, `@react-spring/web` for motion,
Express + Drizzle server, Postgres + PostGIS (Neon), Protomaps vector tiles
served from a self-hosted `.pmtiles` file, Nominatim for geocoding (proxied
server-side, rate-limited to comply with their usage policy).

**Deployment:** single Node process on Render serves the built client, the
API, and an MCP endpoint all from one port. Database on Neon.

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
  listener wired through to a real error state in the UI.
- Added a path-token MCP auth option (`POST /mcp/<token>`) alongside the
  existing header-based one, since Claude's custom-connector-by-URL flow may
  only expose OAuth fields depending on account tier. `static_headers` (the
  proper fix) is in beta and reads as admin/org-scoped per Anthropic's own
  docs, unconfirmed whether it's available on this account.

> **Mistake made and corrected, worth knowing about:** early in this deploy
> I set `VITE_PMTILES_URL` to a URL I hadn't actually verified existed
> (wrong domain, wrong date format, a genuine hallucination, not a typo).
> It caused the exact infinite-loading bug it was meant to fix. Caught it,
> corrected it, and fixed the underlying error-handling gap so this class
> of failure can't hang the UI again. Lesson for future me: verify external
> URLs before wiring them into anything production-facing, especially env
> vars baked into a client build.

## To-Do

- [ ] **Map tiles (the main open item).** No real `.pmtiles` file exists
      yet. Needs a region (city, metro area, or bounding box) from the user.
      This sandbox can't reach `build.protomaps.com` (not in its network
      allowlist), so a real extract can't be self-served. Path forward: user
      runs `pmtiles extract` locally and uploads the result, or provides a
      hosted URL. Once the file exists, committing it to
      `client/public/tiles/region.pmtiles` needs zero extra config, that's
      already the code's documented default path.
- [ ] Confirm whether `static_headers` is actually available on this Claude
      account (Settings -> Connectors -> Add custom connector, check for a
      header/token field). If yes, the header-based `/mcp` URL is cleaner
      than the path-token one currently in use.
- [ ] Regenerate a properly-scoped GitHub token (current one is a classic
      token with full `repo` scope covering every repo on the account) or
      revoke it now that the push work is done.
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

Once a region comes in: build or receive the pmtiles extract, commit it,
redeploy, and confirm the map actually renders real tiles, this is the one
thing that's been unverifiable all session since there's no way to
browser-test the live app directly from here. That closes out a genuine v1.
After that, LobsterID auth is the next real priority before this goes in
front of anyone besides the person running it.

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
