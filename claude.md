# LobsterMaps — Working Notes for the Next Agent

## About the project
LobsterMaps is a privacy-first, self-hosted maps and local-business directory for Bergen, Norway. Part of the Lobster Ecosystem (a hobby project, not commercial).

**Stack:**
- Client: React + Vite, MapLibre GL v6, `@m3e/react` (Material 3 Expressive web components)
- Server: Express + Drizzle ORM, Neon Postgres
- Routing: custom Rust/WASM A* engine (`routing-core/`)
- Hosting: Render (`srv-da77r72d0e5s73dl976g`, workspace `tea-da6k16hsrm7s73aeg0s0`)
- DB: Neon project `floral-silence-23234233`
- Repo: https://github.com/lobsterbs/lobster-maps
- Live: https://lobster-maps.onrender.com

## Current task (as of Sep 26, 2026, 16:25 UTC)

**Root cause fixed:** the whole M3E integration was broken because:
1. `@m3e/react` exports real React wrapper components (via `@lit/react`) — the app was instead doing side-effect-only imports (`import '@m3e/react/search'`) and using raw lowercase custom-element tags with React event props, which never actually bound.
2. The app never mounted `<m3e-theme>` anywhere, so **zero design tokens** reached any component (no colors, shapes, motion — everything unstyled).
3. Several component/tag names were just wrong (`m3e-nav-rail-item` doesn't exist, `m3e-fab-menu-action` doesn't exist, FAB-menu anatomy was backwards, search bar was missing its required `<input slot="input">`).

**Fixed this session:**
- `App.tsx` now imports and wraps everything in `<M3eTheme>` (commit `c745b87`)
- `Map.tsx` fully rewritten to use real `@m3e/react` component imports (`M3eSearchBar`, `M3eNavRail`, `M3eNavItem`, `M3eFab`, `M3eFabMenu`, `M3eFabMenuTrigger`, `M3eFabMenuItem`, `M3eSegmentedButton`, `M3eButtonSegment`, `M3eSwitch`, `M3eIcon`) — verified every prop/event/slot against the actual `custom-elements.json` in `node_modules/@m3e/web`, not guessed (commits `c745b87`, `6a96d98`, `c9540b9`)
- Modal components (`AddBusinessModal`, `AddLocationModal`, `ReportIssueModal`) converted from raw tags to real component imports; fixed `M3eHeading` size prop (`"large"` not `"headline-medium"`) and `M3eDialog`'s close event (`onClosed` not `onClose`)
- **Important:** my first pass at rewriting `Map.tsx` accidentally *deleted* real functionality (basemap switching, 3D terrain via `setTerrain`, 3D building extrusion, live search-with-suggestions, basemap pill switcher) and replaced it with a decorative non-functional stub. Caught this and rebuilt properly — all that logic is restored, just with correct M3E syntax now (commit `c9540b9`)
- Deliberately did **not** duplicate "Add Business" into Map.tsx's FAB menu — `App.tsx` already owns that flow correctly (`AddBusinessFAB` + `AddBusinessModal` + marker refresh via `handleCreated`). Map.tsx's FAB menu only offers Add Location / Report Issue to avoid double-mounting the business modal.

**Deploy status:** commit `c9540b9` pushed, deploy `dep-darv3lnavr4c738b2cvg` triggered manually (auto-deploy didn't seem to fire on push — worth checking Render's auto-deploy setting if this keeps happening). Build was in progress as of last check.

## Known architecture wart (not yet fixed, flagging for whoever picks this up)
App.tsx and Map.tsx both own UI chrome that arguably should live in one place — App.tsx has `SearchBarEnhanced` + category pills + `AddBusinessFAB`/`AddBusinessModal` + `TripPlanner`/`DirectionsPanel`, while Map.tsx (internally) now also has its own search bar, nav rail, and FAB menu (Location/Issue). This predates this session. Two different search UIs exist in the app simultaneously. Worth consolidating eventually but out of scope for the M3E correctness fix.

## To-Do (priority order)
1. 🔴 Verify the c9540b9 deploy actually goes live clean (check Render logs for runtime errors, not just build success)
2. 🔴 Manually verify in a real browser that M3eTheme tokens are actually rendering (colors, not just structurally correct markup) — I could only verify via build success + code review, not live rendering, since the site isn't web-search-indexed and web_fetch requires a prior search hit
3. 🟡 Consolidate the App.tsx/Map.tsx dual-search-bar, dual-chrome situation
4. 🟡 Business Detail Sheet — click marker → detail panel (component exists, wire-check needed)
5. 🟡 Routing on Map — call `/api/routing`, draw polyline (partial — DirectionsPanel/TripPlanner exist, verify end-to-end)
6. 🟡 Mobile layout — drawer at ≤480px, nav-rail should probably collapse to a bottom nav-bar on mobile (M3E has `m3e-nav-bar` for this)
7. ⚪ Code split — maplibre (1.02MB) + mapillary (1.06MB) chunks, both flagged by Vite's build warning
8. ⚪ Auth on `POST /api/businesses` (LobsterID integration is the real fix, not built yet)
9. ⚪ OSM graph extraction (`npm run extract:osm`) — never actually run on Render, WASM routing engine may be running on a stub/test graph

## Plan for next session
1. Confirm deploy `dep-darv3lnavr4c738b2cvg` (or whatever superseded it) is live and error-free in Render logs
2. If clean: move to Business Detail Sheet wiring, then routing polyline draw
3. If there are runtime errors (not caught by `tsc`, e.g. missing CSS custom properties, slot mismatches at runtime): read the actual error, don't guess — `mcp__Render__list_logs` with `type: ["app"]` right after a page load attempt
4. Keep using the `custom-elements.json` at `client/node_modules/@m3e/web/dist/custom-elements.json` as ground truth for any M3E prop/event/slot question — don't guess component APIs from memory, the naming is inconsistent across the library (`m3e-fab-menu-action` vs `m3e-fab-menu-item`, `m3e-nav-rail-item` vs `m3e-nav-item`, etc.)


