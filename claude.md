# LobsterMaps: handoff

**Updated:** Sep 28, 2026
**Live:** https://lobster-maps.onrender.com (deploy dep-dat0s50473hc73e99f50, commit 882fa7d)

## About
Bergen privacy-first maps. React + Vite + MapLibre GL (client), Express + Drizzle (server), Rust/WASM routing.
Repo: github.com/lobsterbs/lobster-maps. Render srv-da77r72d0e5s73dl976g, workspace tea-da6k16hsrm7s73aeg0s0. Neon: floral-silence-23234233.
Auto-deploy does not fire on push, trigger manually via Render MCP.

## Current task
Killing the runtime error "Cannot set property value of # which has only a getter". Fix deployed, NOT yet confirmed in a real browser. Nobody has seen the M3E theme actually render.

## What was actually wrong (read this before touching M3E)
- `m3e-segmented-button` has a getter-only `value`. Passing `value={...}` from React throws that error. Selection is driven by `checked` on each `M3eButtonSegment`. Fixed in Map.tsx.
- Earlier wrong diagnoses (reverted in 882fa7d): dialog `open` and switch `checked` DO have setters. `M3eDialog` exposes `show()`/`close()`, there is NO `showModal()`.
- Dialog close event is `onClosed`, not `onChange`/`onClose`.
- Before that, M3eTheme was missing entirely; it is now registered in main.tsx and wraps App.
- Ground truth for props: client/node_modules/@m3e/web/dist/custom-elements.json plus the dist/*.js source. Check for `readonly: true` and getter-without-setter before passing any prop. Never guess.
- A scan of all M3e JSX props against readonly fields came back clean after this fix.

## To-do
1. Verify in a real browser: no console errors, theme colors render, modals open, segmented button switches mode.
2. Two search bars exist (App.tsx SearchBarEnhanced + Map.tsx M3eSearchBar). Consolidate.
3. Mobile layout at <=480px (nav rail to nav bar).
4. Code-split maplibre (1.02MB) and mapillary (1.06MB).
5. Auth on POST /api/businesses (LobsterID).
6. `npm run extract:osm` never run on Render, WASM routing may be on stub graph.

## Plan
Wait for browser confirmation. If error persists, get the stack trace from the console (main.tsx has a global error handler that dumps the message on screen) and grep that element in custom-elements.json.
