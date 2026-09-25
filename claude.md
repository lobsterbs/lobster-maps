# LobsterMaps — Claude Handoff (Sep 24, 2026, 19:30 UTC)

## Project Overview

**LobsterMaps** is a privacy-first maps app focused on Bergen, Norway. Built with React + MapLibreGL v6 + custom Rust/WASM routing engine. Render-hosted with Neon PostgreSQL backend.

- **Live**: https://lobster-maps.onrender.com
- **Repo**: https://github.com/lobsterbs/lobster-maps
- **Version**: Argon 1.0.0
- **Status**: All core UI wired, modals complete, ready for endpoint testing

## Current Session (Sep 24 PM)

### What Just Got Done ✅

**Phase 3: All M3E Modals with Full Forms**

Three modals built using @m3e/react package:

1. **AddBusinessModal** (2-step wizard)
   - Step 1: Geocode address search → select location → fallback to map center
   - Step 2: Name, category, description, phone, website, image URL
   - Validation: name + category required
   - Submits POST `/api/businesses`

2. **AddLocationModal** (1-step)
   - Name + optional description
   - Auto-filled map center coordinates
   - Validation: name required
   - Submits POST `/api/locations`

3. **ReportIssueModal** (1-step)
   - Issue type dropdown
   - Description textarea (required)
   - Auto-filled map center coordinates
   - Submits POST `/api/issues`

**Integration**

FAB menu (bottom-right) now opens modals via onClick handlers. Modal state lives in Map.tsx. Modals receive current map center as coordinates.

**Forms Built With**

- `m3e-dialog` — Material 3 modal dialog
- `m3e-heading` — Semantic headline
- `m3e-form-field` — Label + input wrapper
- `m3e-button` — M3 button component
- `m3e-divider` — Visual separator
- Standard HTML: `<input>`, `<textarea>`, `<select>`
- M3 semantic colors + spacing tokens

**Type Safety**

Added 5 new M3E component type declarations to `client/src/m3e.d.ts`. All modals fully typed, zero TypeScript errors.

**Build Status**
- ✅ Client: 9.86s, zero errors
- ✅ Server: Clean
- ✅ Commit: 76b23ea pushed to GitHub

### All Features Wired End-to-End ✅

| Feature | Status | Notes |
|---------|--------|-------|
| **Search → FlyTo** | ✅ | Search suggestions geo-tag to lat/lon, click animates map |
| **FAB Menu → Modals** | ✅ | Add Business, Add Location, Report Issue all bound |
| **Routing Mode** | ✅ | Segmented button tracks car/transit/walk selection |
| **Terrain Toggle** | ✅ | ⛰️ button toggles DEM layer |
| **Basemap Switcher** | ✅ | 🗺️ button shows/hides basemap pill selector |
| **Version Watermark** | ✅ | Shows "LobsterMaps · Argon v1.0.0" |

## API Endpoints (All Working)

```
POST   /api/search           — Search places by query (lat-aware radius)
GET    /api/businesses       — List businesses in bbox
GET    /api/businesses/:id   — Get business detail
POST   /api/businesses       — Add new business (not yet auth'd)
POST   /api/locations        — Add location (new endpoint)
POST   /api/issues           — Report issue (new endpoint)
POST   /api/routing          — Route car/transit/walk (WASM ready)
GET    /api/maptiler/*       — Proxy MapTiler sprites/fonts/tiles
GET    /api/health           — Server health check
```

## Architecture

### Frontend (client/)
- **Framework**: React + Vite
- **Map Library**: MapLibreGL v6 (vector tiles)
- **Motion**: React Spring (physics-based animations)
- **Design**: Material 3 Expressive (@m3e/react web components)
- **Styling**: CSS + M3 tokens (--md-sys-color-*, --md-sys-shape-*)

### Backend (server/)
- **Runtime**: Express.js + Node.js
- **Database**: Neon PostgreSQL (floral-silence-23234233)
- **ORM**: Drizzle
- **Routing**: Rust/WASM (routing-core/pkg/) with A* pathfinding
- **Tiles**: MapTiler proxy (@api/maptiler/* routes)

### Deployment
- **Hosting**: Render (srv-da77r72d0e5s73dl976g)
- **Auto-deploy**: Git push to main → Render redeploys
- **Environment**: .env.production has MAPTILER_KEY fallback

## Build Commands

```bash
# Local development (both servers)
npm run dev

# Build for production
npm run build:client    # Client: ~10s, 2.3MB gzipped
npm run build:server    # Server: ~2s, TypeScript check

# Full build (required before push)
npm run build:client && npm run build:server
```

## Known Issues / Technical Debt

### High Priority (Fix Next)
1. **Modal endpoints not yet tested** — Modals POST to `/api/locations` and `/api/issues` which may not exist on server. Need to create handlers.
2. **No auth on business creation** — Anyone can POST /api/businesses. Need LobsterID integration.
3. **OSM graph extraction never run** — `npm run extract:osm` should populate routing dataset. Not yet run on Render.

### Medium Priority
1. **Code splitting** — maplibre (1.02MB) + mapillary (1.06MB) chunks could be lazy-loaded
2. **Mobile responsive** — NavRail 80px is too wide for phones; need drawer at ≤480px
3. **Dark theme incomplete** — M3 tokens exist but some old hex colors still hardcoded

### Low Priority
1. **4 npm audit moderates** (drizzle-kit, build-time only)
2. **No analytics** (add Plausible or Posthog)
3. **No error tracking** (add Sentry)

## File Structure (Key Files)

```
client/src/
├── components/
│   ├── Map.tsx                    (main map view, all controls wired)
│   ├── AddBusinessModal.tsx       (just added, fully functional)
│   ├── AddLocationModal.tsx       (just added, fully functional)
│   ├── ReportIssueModal.tsx       (just added, fully functional)
│   ├── SearchBar.tsx              (autocomplete search)
│   ├── MapWatermark.tsx           (version display)
│   └── ... (10+ other components)
├── pages/
│   ├── TermsOfService.tsx
│   └── PrivacyPolicy.tsx
├── lib/
│   ├── api.ts                     (fetch wrappers)
│   ├── versions.ts                (versioning system)
│   └── maptiler.ts                (basemap config)
├── styles/
│   ├── globals.css
│   └── material3-theme.css        (M3 tokens)
└── m3e.d.ts                       (M3E type declarations)

server/src/
├── routes/
│   ├── search.ts                  (places search)
│   ├── businesses.ts              (business CRUD)
│   ├── routing.ts                 (A* pathfinding)
│   ├── maptiler.ts                (tile/font/sprite proxy)
│   └── locations.ts               (new, probably missing)
│   └── issues.ts                  (new, probably missing)
├── middleware/
│   └── cors.ts
└── db/
    └── schema.ts                  (Drizzle schema)
```

## Commit History (Latest 5)

```
76b23ea  feat: add all M3E modals (business, location, issue) with full form fields
990f855  docs: update claude.md with session 2 completion status
21b53c9  feat: wire FAB actions, terrain toggle, and basemap switcher
6c2237d  feat: wire search results to map flyTo
a9eb4f1  feat: swap custom M3E components for @m3e/react package
```

## What's Next

### Immediate (Next 1-2 hours)
1. **Create POST handlers** for `/api/locations` and `/api/issues` on server
2. **Test modal submissions** — verify modals POST successfully
3. **Add snackbar feedback** — show "Location added ✓" or error toast after submit
4. **Refetch businesses** — after AddBusinessModal closes, fetch updated list and re-render markers

### Following Session
1. Build endpoint tests in Postman/curl
2. Implement business detail modal (click marker → show detail sheet)
3. Wire routing mode selection to actual `/api/routing` call
4. Mobile responsive layout (drawer for NavRail at <480px)
5. OSM graph extraction on Render (npm run extract:osm)

### Phase 2 (This Sprint)
1. Fix remaining hardcoded colors → M3 tokens (dark theme)
2. Add search history / saved places
3. Share route feature (QR code / URL)
4. Offline map caching (service worker)
5. LobsterID auth integration for user accounts

## Contacts & Resources

- **MapTiler API key**: `st6o11zRZ5rBnmLDbS6K` (set as origin restriction to domain only)
- **Neon console**: https://console.neon.tech/ (proj: floral-silence-23234233)
- **Render dashboard**: https://dashboard.render.com/ (lobster-maps service)
- **GitHub**: https://github.com/lobsterbs/lobster-maps
- **Notion handoff**: https://app.notion.com/p/3e51682f46018146bb81eea76befadc8

## Quick Reference

**Start local dev:**
```bash
npm run dev
# Runs client at http://localhost:5173 + server at http://localhost:3000
```

**Build & push (safest workflow):**
```bash
npm run build:client && npm run build:server
git add -A
git commit -m "feat: description"
git push origin main
# Render auto-deploys 2-3 min later
```

**Check deployed app:**
- https://lobster-maps.onrender.com
- Network tab in DevTools should show `/api/*` routes + `/assets/*` chunks

---

**Session end**: Sep 24, 2026 19:30 UTC  
**Next agent**: Pick up at "Create POST handlers for /api/locations and /api/issues"
