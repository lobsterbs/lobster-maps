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

## Known limitation: this sandbox can't reach Protomaps

Confirmed directly (`curl` to `build.protomaps.com` returns
`x-deny-reason: host_not_allowed`): whatever environment a Claude session
is running the deploy work from may not have network access to Protomaps'
build servers, or any real basemap tile source. Checked for alternatives
(Protomaps' own test fixtures are synthetic 1x1-degree squares with no
real geography, not usable) — there isn't a workaround from inside a
sandboxed session. **A real `.pmtiles` region extract has to come from the
user's own machine**, or from a session with broader network access. This
isn't a "pick a region and it'll work" problem, it's a network-access
problem independent of which region gets chosen.

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

- [ ] **Map tiles (the main open item, confirmed blocked from this
      environment).** No real `.pmtiles` file exists yet, and this sandbox
      cannot reach any real basemap tile source (confirmed via direct
      test, see above). Needs the user to run `pmtiles extract` on their
      own machine and upload the result, or provide a hosted URL some
      other way. Once the file exists, committing it to
      `client/public/tiles/region.pmtiles` needs zero extra config, that's
      already the code's documented default path.
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
