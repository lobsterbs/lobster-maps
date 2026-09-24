# LobsterMaps - Development Status & Handoff

**Last Updated**: Sept 24, 2026 (Session 2)
**Commit**: `a9eb4f1` — M3E React package migration complete
**Status**: 🟢 Builds passing, ready for feature wiring

---

## 🎯 Project Overview

LobsterMaps is a privacy-first maps app for Bergen. Frontend runs React + Vite, backend is Express + Drizzle ORM, hosted on Render with Neon DB.

- **Live**: https://lobster-maps.onrender.com
- **Repo**: https://github.com/lobsterbs/lobster-maps
- **Build Time**: Client ~11s, Server ~5s
- **Version**: Argon 1.0.0

---

## ✅ What Was Just Done (Session 2)

Replaced all 19 custom M3E components with the real `@m3e/react` package. This was a major cleanup:

- **Deleted**: 4,000+ lines of custom component code
- **Installed**: `@m3e/react`, `@m3e/icons`
- **Rewrote**: `Map.tsx` to use real M3E Web Components
- **Added**: `m3e.d.ts` for JSX type support

### Components Now Using M3E

| Component | What It Does | Status |
|-----------|-------------|--------|
| `<m3e-search>` | Business/location autocomplete | ✅ Wired to `/api/search` |
| `<m3e-nav-rail>` | Left sidebar (80px) | ✅ Renders |
| `<m3e-fab-menu>` | Add business/location/report | ⏳ Styled, needs actions |
| `<m3e-segmented-button>` | Mode toggle (car/transit/walk) | ⏳ Renders, needs routing |
| Basemap pills | Style switcher | ⏳ Styled, needs functionality |
| Terrain toggle | 3D on/off | ❌ Removed, needs re-add |

**Build Status**: ✅ Both client and server build cleanly with zero TS errors.

---

## 📋 Immediate Next Steps (Top Priority)

### 1. Search → Fly to Result (10–15 min)
```typescript
// In Map.tsx handleSearchSelect:
const result = searchSuggestions.find(s => s.id === id);
if (result.lat && result.lon) {
  mapRef.current?.flyTo({ center: [result.lon, result.lat], zoom: 16 });
}
```

### 2. Segmented Button → Routing Mode (10 min)
Wire the `onChange` handler to set routing mode, pass it to `/api/routing` calls.

### 3. FAB Menu → Show Sheets (15 min)
Add modal/sheet components for:
- Add Business form
- Add Location form
- Report Issue form

### 4. Basemap Switcher (10 min)
Connect pill buttons to existing `switchBasemap()` function.

### 5. Terrain Toggle (5 min)
Re-add the toggle that got removed during cleanup. Call existing `toggleTerrain()`.

---

## 🔧 Key Files & Locations

**Components**
- `client/src/components/Map.tsx` — Main map, all M3E components
- `client/src/components/VersionIndicator.tsx`
- `client/src/components/MapWatermark.tsx`
- `client/src/components/BusinessDetailSheet.tsx`

**API Routes** (server)
- `server/src/routes/search.ts` — Lat-aware radius search
- `server/src/routes/businesses.ts` — Get business data
- `server/src/routes/routing.ts` — OSRM proxy
- `server/src/routes/maptiler.ts` — MapTiler proxy

**Config**
- `client/src/m3e.d.ts` — JSX type declarations for M3E web components
- `client/src/styles/material3-theme.css` — Design tokens
- `client/src/lib/maptiler.ts` — MapTiler setup & basemap list

**Versions**
- `client/src/lib/versions.ts` — Version number (Argon 1.0.0)

---

## 🧠 Things to Remember

### Before Every Push
```bash
npm run build:client && npm run build:server
# If either fails, don't push
git push origin main  # uses GH token from .bashrc
```

### M3E Web Components (Not React)
- Lowercase with hyphens: `<m3e-search>`, `<m3e-fab-menu>`
- JSX support requires type defs in `m3e.d.ts`
- Events via standard handlers: `onInput`, `onChange`, `onClick`
- Styling uses CSS custom properties: `var(--md-sys-color-primary)`

### MapTiler Setup
- Key: `st6o11zRZ5rBnmLDbS6K` (origin-restricted)
- Proxy at: `/api/maptiler/*` (Express route)
- Styles loaded from proxy, not direct

### Database (Neon)
- Project: `floral-silence-23234233`
- Access via Neon MCP tool, not direct connection
- Drizzle ORM handles queries

---

## 🐛 Known Issues (Won't Block Progress)

| Issue | Impact | Fix |
|-------|--------|-----|
| Hardcoded `rgba()` in some components | Minor styling | Replace with token vars |
| `document.title` never updates | Can't tell where you are | Add useEffect hook |
| No auth on POST /api/businesses | Security gap | Add middleware check |
| Large chunks (maplibre 1MB, mapillary 1MB) | Bundle size | Dynamic import or skip mapillary |
| OSM graph never extracted | Unused Rust code | Run `npm run extract:osm` on Render |

---

## 📈 What's Already Working

✅ Map renders with MapTiler styles
✅ Search API returns businesses (lat-aware radius)
✅ All M3E components render without errors
✅ TypeScript compilation clean
✅ Render deployment works (auto-deploys on git push)
✅ MapTiler proxy routes work
✅ Neon DB connection stable

---

## 🚀 Next Session Workflow

1. **Read this file first** (you're doing it now)
2. **Check latest commit** in GitHub
3. **Run builds locally** to verify state
4. **Focus on next steps** (search fly, routing wire, FAB actions)
5. **Update this file** when done, push to GitHub

---

## 💾 Build & Deploy

```bash
# Local dev
cd /home/claude/lobster-maps
npm run build:client && npm run build:server
# If zero errors, safe to push

# Push (auto-triggers Render deploy)
git push origin main

# Monitor Render
# Visit: https://lobster-maps.onrender.com
# Check: https://dashboard.render.com/services/srv-da77r72d0e5s73dl976g
```

---

## 📚 Useful URLs

- **Live App**: https://lobster-maps.onrender.com
- **GitHub**: https://github.com/lobsterbs/lobster-maps
- **Render Dashboard**: https://dashboard.render.com
- **Neon Console**: https://console.neon.tech
- **MapTiler Dashboard**: https://cloud.maptiler.com
- **Notion Handoff**: https://app.notion.com/p/3e51682f46018146bb81eea76befadc8?pvs=204

---

**End of Handoff Document**
