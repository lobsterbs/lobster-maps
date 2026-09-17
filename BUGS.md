# LobsterMaps - Bugs, Audit Report & Feature Roadmap

> **Status:** Production Ready (`v2.0.0-wasm`)  
> **Last Audit:** September 17, 2026  
> **Target Region:** Bergen & Vestland, Norway  

---

## 📑 Executive Summary

This document details the comprehensive code audit, resolved bugs, known technical constraints, storage caching strategy, and future feature roadmap for **LobsterMaps**—a privacy-first, Material Design 3 Expressive maps & navigation web application.

---

## 💾 Storage & Caching Architecture Strategy

### Why NOT Cookies?
* **Cookie Limitations:** Browser cookies are capped at **4KB per cookie** and are sent in plain text with **every HTTP request header** to the server. Attempting to store map tiles or POI datasets in cookies causes massive HTTP request overhead and header overflow errors (`413 Request Header Fields Too Large`).
* **Cookies Use Case:** Reserved only for lightweight, non-sensitive session tokens or user preferences if needed.

### Recommended Multi-Tier Storage Matrix

| Storage Tier | Technology | Max Capacity | Primary Use Case |
|---|---|---|---|
| **Tier 1: Fast Preferences** | `localStorage` | ~5MB | Last view state (center, zoom, pitch), recent search history, dark/light theme setting, active category filter. |
| **Tier 2: Business & Route Cache** | `IndexedDB` (`LobsterMaps_MapCache`) | >500MB | 7-day TTL route geometries, 24-hr POI business lists, geocoding cache, local business bookmarks. |
| **Tier 3: Vector Tile & Offline Map** | `CacheStorage` + `ServiceWorker` | >1GB | MapLibre `.pbf` vector tiles, MapTiler glyphs/fonts, terrain DEM tiles, and offline basemap layers. |
| **Tier 4: Vector Tile Protocol** | `maplibregl.addProtocol('cached', ...)` | In-Memory / IDB | Custom MapLibre tile loader protocol intercepting HTTP requests to return cached IndexedDB tiles offline. |

---

## 🛠️ Resolved Bugs & Audit Fixes

### 1. Map & Geographic Accuracy
* **[FIXED] Inverted Coordinates in LocalStorage State (`App.tsx`)**
  * *Symptom:* Saving view state passed `[center.lat, center.lng]`, restoring `[60.3913, 5.3221]` (inverted `[lat, lng]`) which teleported the map into the ocean near Antarctica.
  * *Fix:* Updated to correct `[center.lng, center.lat]` tuple order.
* **[FIXED] Default Map Location (`App.tsx`)**
  * *Symptom:* Default initial center state was hardcoded to `[-73.9857, 40.7484]` (New York City).
  * *Fix:* Set initial center state to Bergen, Norway coordinates (`[5.3221, 60.3913]`).
* **[FIXED] Custom Marker Alignment (`App.tsx`)**
  * *Symptom:* MapLibre markers omitted `anchor: 'bottom'`, defaulting to `'center'`, which rendered marker pin tips ~20px below their true geographic coordinates.
  * *Fix:* Added `{ anchor: 'bottom' }` to both business and cluster marker constructors.

### 2. Memory & Performance Safety
* **[FIXED] React 18 `createRoot` Fiber Memory Leak (`App.tsx`)**
  * *Symptom:* Supercluster marker rendering loop called `createRoot(el).render(...)` without unmounting previous roots when markers were removed, causing React root memory leaks during map pan/zoom.
  * *Fix:* Tracked root references on marker element instances (`(el as any)._reactRoot`) and invoked explicit `.unmount()` teardowns prior to DOM removal.

### 3. Material Design 3 Expressive & UI Compliance
* **[FIXED] Legacy Red Hex Colors Removed**
  * *Symptom:* `AddBusinessFAB`, `BusinessMarker`, and `ClusterMarker` used legacy `#E83F3F` and `--lobster-red` colors.
  * *Fix:* Standardized all actions and markers to Material Design 3 Emerald tokens (`var(--md3-primary, #10b981)`).
* **[FIXED] DirectionsPanel Rendering Disconnect (`App.tsx`, `DirectionsPanel.tsx`)**
  * *Symptom:* `App.tsx` checked `typeof tripPlannerTo === 'string'`, but `tripPlannerTo` was an object (`TripPlace`). `to` evaluated to `undefined`, causing `DirectionsPanel` to fail rendering.
  * *Fix:* Resolved `to` prop to safely extract `tripPlannerTo.label` when passed an object.
* **[FIXED] Unrendered Category Filtering UI (`App.tsx`)**
  * *Symptom:* Category filter state existed in `App.tsx` but was not exposed in the JSX UI.
  * *Fix:* Added an interactive, horizontally scrollable Category Filter Chips bar under the main search bar.

### 4. React State Management & Lifecycle
* **[FIXED] Direct `setState` Execution in Render Body (`TripPlanner.tsx`)**
  * *Symptom:* State synchronization executed directly inside the component body, triggering React strict mode warnings and re-render loops.
  * *Fix:* Wrapped `initialTo` state synchronization inside a `useEffect` hook.

### 5. Privacy & Security Hardening
* **[FIXED] Third-Party Telemetry Leak (`PlaceDetailSheet.tsx`)**
  * *Symptom:* Fallback images loaded from `https://via.placeholder.com/...`, leaking user search queries and IP addresses to a third-party HTTP service.
  * *Fix:* Replaced external network calls with a self-contained local SVG data URI placeholder.
* **[FIXED] Insecure URL Log Auth Leak (`server/src/index.ts`)**
  * *Symptom:* Express endpoint exposed path-based auth token `/mcp/:token`, logging secrets in plain HTTP access logs.
  * *Fix:* Removed path token route in favor of HTTP Authorization headers.

### 6. Server & Engine Reliability
* **[FIXED] Router Priority Queue Algorithm (`server/src/routing/router.ts`)**
  * *Symptom:* A* pathfinding used an $O(N \log N)$ array-sorting priority queue.
  * *Fix:* Replaced with an $O(\log N)$ binary min-heap for fast node expansion.
* **[FIXED] Resilient Multi-Strategy Fallback Routing (`server/src/routes/routing.ts`)**
  * *Symptom:* Unhandled 500 error occurred when the OSM graph was uninitialized.
  * *Fix:* Built a 3-tier fallback engine: (1) Custom A* graph -> (2) OpenRouteService API -> (3) Haversine road-topology interpolation.
* **[FIXED] Complete WASM Node.js Fallbacks (`server/src/wasm/index.ts`)**
  * *Symptom:* Server threw exceptions when WASM binary was missing on systems without Rust.
  * *Fix:* Implemented full Node.js fallbacks for `RateLimiter` (token bucket with LRU sweep), `SearchScorer` (Levenshtein + Haversine composite weighting), and `WeatherCache`.

---

## ⚠️ Known Technical Constraints & Edge Cases

1. **GIS Bundle Size**
   * *Status:* MapLibre GL (~1MB) and Mapillary JS (~1MB) account for the majority of the client bundle.
   * *Mitigation:* Code chunking configured in `vite.config.ts`. Further lazy-loading via dynamic `import()` for StreetView / Mapillary is recommended for initial load speed on low-bandwidth mobile connections.
2. **Local WASM Compilation**
   * *Status:* Building native `.wasm` files requires `cargo` and `wasm-pack`.
   * *Mitigation:* Robust JS/TS fallback implementations ensure 100% functionality without WASM binaries.
3. **CORS Headers**
   * *Status:* Server CORS default configured for `http://localhost:5173`.
   * *Action:* Ensure `CORS_ORIGIN` environment variable matches production deployment domain (`https://lobster-maps.onrender.com`).

---

## 🚀 Feature Roadmap & Expanded Proposal Ideas

### 📦 Caching & Offline Capabilities
- [ ] **Offline Region Downloader ("Pre-cache Bergen")**
  * Allow users to click a "Download Offline Region" button that pre-fetches and stores all vector map tiles (zoom 10–16) for Vestland into `CacheStorage` via a Service Worker.
- [ ] **MapLibre Custom Tile Protocol (`maplibregl.addProtocol`)**
  * Register a `cached-tile://` protocol in MapLibre that serves cached `.pbf` tiles directly from IndexedDB when network connectivity is lost.
- [ ] **Offline Search Index (FlexSearch / WASM in Browser)**
  * Store business POIs in browser IndexedDB and perform client-side Levenshtein/category search without hitting the backend server when offline.

### 🎯 Core Features & Norway Integrations
- [ ] **Entur Transit API Integration (Norway)**
  * Integrate real-time bus, light rail (Bybanen), and ferry departures via Norway's national Entur GraphQL API.
- [ ] **Multi-Stop Route Planning (Waypoints)**
  * Extend `TripPlanner` and routing engine to support adding intermediate waypoints along a journey.
- [ ] **Low-Power / Battery Saver Mode**
  * Monitor `navigator.getBattery()`. When battery is low (<20%), automatically cap map rendering to 30fps, disable 3D terrain pitch, and switch to flat 2D mode to preserve battery.

### 🎨 UI/UX Polish & Interactive Tools
- [ ] **Live Rain & Weather Radar Map Overlay**
  * Display a togglable MET Norway precipitation radar tile overlay directly on the map.
- [ ] **Elevation Profile Graph**
  * Render an interactive elevation profile chart for walking and cycling routes using SVG / Canvas.
- [ ] **Peer-to-Peer Route / Meeting Point Sharing (WebRTC / QR Code)**
  * Generate a scannable offline QR code or WebRTC connection to share current location or pin coordinates with a friend nearby without requiring internet access.
- [ ] **Dark / Light Theme Toggle Switch**
  * Add a manual UI toggle to switch between dark and light Material Design 3 color palettes.

### ♿ Accessibility & Auditing
- [ ] **Keyboard Navigation & ARIA Live Regions**
  * Add keyboard focus traps for bottom sheets and ARIA live regions for route state announcements.
- [ ] **Custom 3D Landmark Animations**
  * Add smooth camera tilt/orbit animations when selecting iconic Bergen landmarks (e.g., Bryggen, Fløibanen, Håkonshallen).
