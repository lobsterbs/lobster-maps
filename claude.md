# LobsterMaps - Development Status & Handoff

**Last Updated**: Sept 24, 2026 (Session 2 Complete)
**Latest Commits**:
- `a9eb4f1` — M3E React package migration
- `6c2237d` — Search flyTo wiring
- `21b53c9` — FAB actions, terrain toggle, basemap switcher
**Status**: 🟢 All core map interactions wired and working

---

## 🎯 Project Overview

LobsterMaps is a privacy-first maps app for Bergen. Frontend: React + Vite, Backend: Express + Drizzle ORM, Hosted: Render with Neon DB.

- **Live**: https://lobster-maps.onrender.com
- **Repo**: https://github.com/lobsterbs/lobster-maps
- **Build Time**: Client ~11s, Server ~5s
- **Version**: Argon 1.0.0

---

## ✅ What Was Just Done (Session 2 - Complete)

### Part 1: Replaced Custom Components with Real Package

All 19 custom M3E components deleted (4,000+ LOC). Installed real `@m3e/react` package instead.

- **Why**: Real package is battle-tested, maintained by Material Design team
- **How**: Rewrote Map.tsx to use `<m3e-*>` web components directly
- **Result**: Simpler, cleaner, more maintainable codebase

### Part 2: Wired All Core Map Interactions

| Feature | Status | How It Works |
|---------|--------|-------------|
| **Search → FlyTo** | ✅ Done | Type in search → select result → map smoothly flies to location (1.2s) |
| **Routing Mode** | ✅ Done | Segmented button (Car/Transit/Walk) saves selected mode to state |
| **FAB Menu** | ✅ Done | Three buttons log to console (Add Business/Location, Report Issue) |
| **Terrain Toggle** | ✅ Done | ⛰️ button in top-right, highlights when active |
| **Basemap Switcher** | ✅ Done | 🗺️ button opens/closes basemap pill selector |

---

## 📋 What's Left (Next Session)

### High Priority (User-Facing)

1. **Add Business Modal** (10-15 min)
   - Form: name, description, category, address
   - POST to `/api/businesses` when submitted
   - Wire up FAB "Add Business" action

2. **Add Location Modal** (10-15 min)
   - Form: name, coordinates (or click on map), description
   - POST to backend
   - Wire up FAB "Add Location" action

3. **Report Issue Modal** (5-10 min)
   - Form: issue type, description, location
   - POST to backend
   - Wire up FAB "Report Issue" action

4. **Routing on Map** (15-20 min)
   - When user selects destination (via search or click), show route
   - Call `/api/routing` with from/to coordinates and selected mode (driving/transit/walking)
   - Draw polyline on map
   - Show directions panel with turn-by-turn

5. **Business Detail Sheet** (10-15 min)
   - When user clicks on a business marker, show detail panel
   - Display: name, address, category, website, phone, hours, rating
   - Add call/website/share buttons

### Medium Priority (Polish)

- Mobile layout testing (80px NavRail is wide for phones)
- Test all M3E components on real device
- Verify search autocomplete UI looks right
- Check contrast ratios (M3 compliance)

### Low Priority (Cleanup)

- Replace hardcoded `rgba()` colors with token vars
- Update `document.title` on location change
- Code-split maplibre/mapillary (1MB+ chunks)
- Add auth to POST endpoints
- Run `npm run extract:osm` on Render

---

## 🔧 Key Files & Locations

**Main Component**
- `client/src/components/Map.tsx` — Everything happens here now

**API Routes** (server)
- `/api/search` — Geocoding + business search (lat-aware radius)
- `/api/businesses/:id` — Business detail
- `/api/routing` — Calculate routes
- `/api/maptiler/*` — Style/tiles/fonts proxy

**Configuration**
- `client/src/m3e.d.ts` — JSX types for M3E components
- `client/src/styles/material3-theme.css` — Design tokens
- `client/src/lib/versions.ts` — Version numbering

---

## 🧠 Key Principles

### M3E Web Components (Not React)
- Use lowercase with hyphens: `<m3e-search>`, `<m3e-fab-menu>`
- JSX support via type defs in m3e.d.ts
- Events: standard handlers (`onInput`, `onChange`, `onClick`)
- Styling: CSS variables (`var(--md-sys-color-primary)`)

### Before Every Push
```bash
npm run build:client && npm run build:server
# If either fails, don't push
git push origin main
```

### Map Interaction Pattern
- User action → state update → re-render → effect if needed
- Example: search selection → update state → handleSearchSelect fires → mapRef.flyTo()

---

## 📈 What's Working Now

✅ Map renders with MapTiler styles  
✅ Search bar returns suggestions (lat-aware radius)  
✅ Search results fly to location when selected  
✅ Routing mode selector (car/transit/walk)  
✅ Terrain toggle (3D on/off)  
✅ Basemap switcher (6 styles)  
✅ FAB menu with three actions (wired to console)  
✅ All M3E components render without errors  
✅ TypeScript compilation clean  
✅ Render auto-deploy works  

---

## 🚀 Next Session Workflow

1. **Read this file** (context)
2. **Check latest commits** on GitHub
3. **Run builds locally** to verify state
4. **Pick one task** from "High Priority" above
5. **Build → test → commit → push**
6. **Update this file** when done

---

## 💾 Build & Deploy

```bash
# Verify builds work
cd /home/claude/lobster-maps
npm run build:client && npm run build:server

# If zero errors:
git push origin main  # Render auto-deploys

# Monitor:
# Live: https://lobster-maps.onrender.com
# Dashboard: https://dashboard.render.com
```

---

## 📚 Useful URLs

- **Live App**: https://lobster-maps.onrender.com
- **GitHub**: https://github.com/lobsterbs/lobster-maps  
- **Render**: https://dashboard.render.com/services/srv-da77r72d0e5s73dl976g
- **Notion Handoff**: https://app.notion.com/p/3e51682f46018146bb81eea76befadc8?pvs=204

---

**End of Handoff Document**
