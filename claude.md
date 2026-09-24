# LobsterMaps - Session Continuation Notes

**Last Updated**: Sep 24, 2026 · **Session**: M3E Typography & Search API
**Deployed**: https://lobster-maps.onrender.com | **Repo**: https://github.com/lobsterbs/lobster-maps

---

## Project Summary

**LobsterMaps** is a privacy-first maps & business directory for Bergen, Norway. Built with React + Vite (client), Express + Drizzle (server), MapLibre GL v6, and custom Rust/WASM A* routing.

- **Stack**: React 18 + Vite + MapLibre GL v6 | Express 4 + Drizzle ORM + Neon PostgreSQL | Rust routing engine
- **Design System**: Material Design 3 Expressive (M3E) — full component library (9 components shipped in Phase 1)
- **Version**: Argon 1.0.0 (public release, Sep 2026)
- **Privacy**: Zero tracking, all requests proxied through Render server, fonts self-hosted

---

## Current State (Just Completed)

### ✅ This Session's Work

1. **Google Sans Flex Typography** — Applied globally to `html`/`body` in `material3-theme.css`
   - Font-family: `'Google Sans Flex', system-ui, -apple-system, sans-serif`
   - All 9 weights available (100–900)
   - Affects every UI element automatically

2. **Search API Latitude-Aware Radius**
   - Fixed: radius calculation now accounts for latitude (cos(lat)) for accurate bounding boxes
   - Bergen (60°N) radius now correct instead of stretched

3. **Response Format Cleanup**
   - Removed redundant `error: null` from successful search responses
   - Cleaner API contract: only include `error` field on actual errors

4. **Build Status**: ✅ Client 10.79s, ✅ Server clean, ✅ Both pushed to GitHub (`ed24dfc`)

---

## Known Issues (Priority Order)

| Priority | Issue | Impact | Fix |
|----------|-------|--------|-----|
| 🔴 High | Hardcoded rgba colors in BusinessDetailSheet, MapWatermark, StreetViewLayer | Not using M3 tokens | Replace with CSS var `--md-sys-state-*` tokens |
| 🟡 Medium | Components not wired into Map view (NavRail, FABMenu, Segmented, Breadcrumb) | Built but unused | Wire into Map.tsx layout |
| 🟡 Medium | Document title never updates | Poor UX/SEO | Add `useEffect` in Map to set `document.title` on location change |
| 🟡 Medium | MapTiler sprite proxy untested in production | May fail silently | Verify in browser DevTools on Render |
| 🟡 Medium | OSM graph not extracted (`npm run extract:osm` never run) | Routing engine missing data | Run extraction, commit `routing-core/data/` |
| ⚪ Low | 1.02 MB maplibre + 1.06 MB mapillary chunks | Bundle size | Dynamic import street view layer |
| ⚪ Low | No auth on POST /api/businesses | Open to abuse | Wire LobsterID integration |
| ⚪ Low | 4 npm audit moderates (build-time) | Minor | Run `npm audit fix` if needed |

---

## Components Status

### ✅ M3E Components Built (Phase 1)
- MD3NavRail (80px sidebar, icons, labels, badges)
- MD3FABMenu (56→80dp morph, submenu, spring 350ms)
- MD3SegmentedButton (satellite/3D toggle, radio group)
- MD3Breadcrumb (location hierarchy)
- MD3Skeleton + MD3MapSkeleton (pulse loading)
- MD3Card (elevation, image header, actions)
- MD3ButtonGroup (connected actions: bus/walk/car/share/call)
- MD3ExpressiveToolbar (floating pill + docked, FAB integration)
- MapWatermark ("🦞 LobsterMaps · Argon" overlay)

### ⚪ Components Built But Not Wired
- MD3Button, MD3Switch, MD3AdvancedSearchBar, MD3LocationCard, MD3TimelineRail
- MD3RoutePlannerCard, MD3EnhancedRouteSelectorCard, MD3NavigationFlow, MD3BergenFeaturesCards
- TermsOfService, PrivacyPolicy (pages)

### ⚠️ Non-M3E Components (38 total)
- AddBusinessFAB, AddBusinessModal, BusinessDetailSheet, BusinessMarker
- ClusterMarker, DirectionsPanel, GlassCard, LoadingMorph, SearchBar, SearchBarEnhanced
- Snackbar, StreetViewLayer, ThreeDLayer, TripPlanner, PlaceDetailSheet, WavyLinearProgress
- Ripple, VersionIndicator (+ others)

---

## API Endpoints (All Working)

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/search` | POST | ✅ Fixed | Lat-aware radius, clean response |
| `/api/businesses` | GET | ✅ Clean | Validates bbox order & coordinates |
| `/api/businesses/:id` | GET | ✅ Full detail | Fetches phone, website, hours |
| `/api/routing` | POST | ✅ Validates | From/to lat/lng bounds check |
| `/api/maptiler/*` | GET | ✅ Proxies | Style, tiles, glyphs, sprites |
| `/api/health` | GET | ✅ Always ready | |

---

## Next Steps (Next Session)

### Immediate (Wire Components Into Map)
1. Add NavRail to left sidebar in Map.tsx
2. Replace green "+" button with FABMenu (add business / add location / report)
3. Replace 3D dropdown with SegmentedButton
4. Add Breadcrumb at top (Bergen → district → street)
5. Show MapWatermark on map

### Short-term (Hardcoded Colors → Tokens)
1. Replace all hardcoded rgba in BusinessDetailSheet
2. Replace all hardcoded rgba in MapWatermark
3. Replace all hardcoded rgba in StreetViewLayer
4. Use `--md-sys-state-*` tokens everywhere

### Medium-term (Search & Details)
1. Wire MD3AdvancedSearchBar into search
2. Show MD3Card in modal/drawer for business details
3. Add MD3Skeleton while map loads
4. Update `document.title` when location/business changes

### Longer-term
1. Extract OSM graph (`npm run extract:osm`)
2. Wire LobsterID into POST /api/businesses
3. Code-split mapillary & maplibre (dynamic import)
4. Verify MapTiler sprite proxy on production

---

## Build & Deploy Workflow

```bash
# Local development
npm run dev

# Build before every push (catch TS errors early)
npm run build:client && npm run build:server

# Commit & push
git add -A
git commit -m "feat: description"
git push origin main

# Render auto-deploys on push
# Monitor at: https://dashboard.render.com (srv-da77r72d0e5s73dl976g)
```

**Critical**: Always build locally first. Broken builds waste Render time & deploy slots.

---

## Architectural Constraints

- VITE_* vars inlined at build time (not runtime)
- `routing-core/pkg/` committed to repo (Render has no Rust toolchain)
- Neon DB only via MCP, not direct connections
- No react-router-dom (pages use onClose callbacks)
- All fonts self-hosted for privacy
- MapTiler key: fallback in server proxy (production-safe)

---

## Useful Shortcuts

| What | Command |
|------|---------|
| Check fonts | `grep -r "Google Sans\|font-family" client/src/styles/` |
| Find hardcoded colors | `grep -r "rgb\|#[0-9a-f]" client/src/components --include="*.tsx" \| grep -v "var(--"` |
| List all components | `ls client/src/components/*.tsx` |
| Check API routes | `grep "router\\.get\|router\\.post" server/src/routes/*.ts` |
| Verify build | `npm run build:client && npm run build:server` |
| Latest commit | `git log -1 --oneline` |

---

## Session Skills Used

- `react-spring-physics` — Spring motion for FABMenu (350ms expand/collapse)
- `threejs-webgl` — 3D terrain layer (ready, not wired yet)
- `zero-hallucination-coder` — API fixes verified against Drizzle + Express patterns
- `universal-scraping-architect` + Firecrawl — M3E docs research (https://matraic.github.io/m3e/)
- `barba-js` — Smooth page transitions (ready to integrate)
- `caveman` — Kept response focused, avoided over-documentation

---

## Memory & Notion

- Project memory: `/projects/01a0398a-587a-75e3-aa7b-373d8ae42951/`
- Notion workspace: Check LobsterMaps project board
- Transcript: `/mnt/transcripts/2026-09-23-21-00-26-lobstermaps-m3e-component-sprint.txt`
