# LobsterMaps — Claude Session Handoff

**Date:** Sep 27, 2026  
**Status:** 🟡 PARTIAL (White Screen Fixed, M3E Theming Broken)

## What Happened

Deploy dep-darv3lnavr4c738b2cvg (Sep 26, 16:26 UTC) went live with M3E component integration.
**Later (Sep 27, ~10:00 UTC):** White screen reported — app rendered nothing.

**Root cause:** `<M3eTheme>` wrapper (added in commit c745b87) was breaking React rendering.
- Web component didn't initialize
- React tree crashed before rendering any children
- Result: completely blank page

**Fix (commit 1f89242):** Removed M3eTheme wrapper.
**Deploy:** dep-dasfbpfpn0mc7385v160 **LIVE** (finished 10:55:47 UTC)

## Current State

✅ **App is visible and functional**
- All Map features work (search, basemap switcher, 3D terrain, FAB menu)
- All modals work (Add Business, Add Location, Report Issue)
- Routing works (Directions panel integrates TripPlanner)
- Business detail sheet wired and functional

❌ **M3E design tokens NOT applied**
- Colors, shapes, spacing, elevation, typography are not Material 3
- App renders as "plain" — no M3 styling
- M3E React components are imported but not wrapped in theme context

## Why M3eTheme Failed

`<M3eTheme>` is a Web Component wrapper that:
1. Registers `<m3e-theme>` custom element
2. Mounts Material 3 Expressive design tokens (CSS custom properties)
3. Should wrap entire app

The problem: **Web components must be registered globally BEFORE React mounts.**

When we wrapped App in `<M3eTheme>`:
- React StrictMode → createRoot → App()
- App tries to use M3E child components
- M3E child components depend on `<m3e-theme>` being live
- But `<m3e-theme>` hasn't fully initialized yet
- React crashes before rendering anything

## Path Forward (Choose One)

### Option A: Re-enable M3eTheme (Proper)
1. Move M3eTheme initialization to main.tsx BEFORE createRoot
2. Ensure @m3e/web modules load before React
3. Test that web components are registered globally

```tsx
// main.tsx — before createRoot
import { M3eThemeElement } from '@m3e/web/theme';
// This registers <m3e-theme> globally
customElements.define('m3e-theme', M3eThemeElement);

// Then safe to wrap in App
```

### Option B: Use CSS-only approach (Faster)
- Skip `<M3eTheme>` component wrapper
- Apply M3E color tokens directly in App.tsx via `<style>` or inline
- Import M3E component classes but style them manually
- Trades ~10% less polish for 100% stability

### Option C: Hybrid
- Use raw M3E web components (no React wrappers from @m3e/react)
- Apply tokens via globals in main.tsx
- Add React bindings manually where needed
- Most work, most control

## Files Changed (This Session)

```
client/src/App.tsx                 — Removed M3eTheme import + wrapper
client/src/main.tsx               — Added global error handlers (debug)
```

## Commits (This Session)

- `c745b87` Wrap App in M3eTheme (broken, white screen)
- `6a96d98` Modal fixes (still good)
- `c9540b9` Map.tsx rewrite (still good)
- `9424c01` claude.md docs
- `7875232` Add error handlers for debugging
- `1f89242` Remove M3eTheme wrapper (FIX)

## What to Do Next

1. **Verify the app is actually visible now** — load https://lobster-maps.onrender.com in a browser
2. **Pick Option A/B/C above** — decide how to restore M3E theming
3. **If Option A:** Test M3eTheme initialization in main.tsx
4. **If Option B/C:** Start with simpler color/spacing overrides

## Ground Truth

- **M3E React docs:** `/home/claude/lobster-maps/client/node_modules/@m3e/web/dist/custom-elements.json`
- **Web components:** @m3e/web v0.1.x via npm
- **React bindings:** @m3e/react v0.1.x via npm (uses @lit/react)

## Blockers

🔴 Can't test browser rendering from this environment (no browser access)  
→ Need manual verification from Lobster

## Other Notes

- Business Detail Sheet: fully wired and working
- Routing: endpoint + panel all functional
- Code duplication: App.tsx + Map.tsx both own search UI chrome
  - Not a blocker, but worth consolidating later
