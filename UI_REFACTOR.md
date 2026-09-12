# LobsterMaps UI/UX Refactor - Google Maps Approach

## Current Problems
1. **SearchBar doesn't blend** - styling issues, doesn't integrate with map
2. **Category filter bar** - clutters UI, needs removal
3. **Loads all businesses at once** - performance issue, should lazy-load
4. **Search is broken** - POST /api/search returning 500 or wrong results
5. **Overall UX** - doesn't match Google Maps simplicity

## Goals
- Match Google Maps UI/UX approach
- SearchBar integrated into map (top-left or centered)
- Businesses loaded on-demand: only when zoomed in close (z>15)
- Better search with autocomplete
- Clean, minimal interface
- Proper performance

## Required Changes

### 1. Remove CategoryFilterChips
- File: `client/src/components/CategoryFilterChips.tsx`
- Location: Appears near top of map
- Action: Remove from App.tsx rendering

### 2. Fix SearchBar Integration
- Move into map container (top-left, like Google Maps)
- Match map's dark theme completely
- Should be semi-transparent, blend with background
- Use maplibregl-style colors

### 3. Lazy-Load Businesses
- Only fetch when:
  - Zoom level >= 15
  - User stops panning (debounce)
  - User explicitly searches
- Implementation:
  - Add zoom listener to map
  - Only call `/api/businesses?bbox=...` when zoom >= 15
  - Cluster on lower zooms, individual markers on high zoom

### 4. Fix Search System
- Currently: POST /api/search broken (returns 500)
- Need: Proper geocoding + business search
- Should show:
  - Place results (from Nominatim)
  - Business results (if available)
  - Recent searches
- With autocomplete/suggestions

### 5. Scrape Businesses
- Instead of loading all at once
- Call `/api/businesses` with bbox when needed
- Implement proper pagination or streaming
- Cache results locally (IndexedDB)

### 6. Map Improvements
- Full-screen canvas (no sidebar clutter)
- SearchBar floating on top-left
- VersionIndicator bottom-left (done)
- Cluster markers (supercluster, already configured)
- Click to show business detail (sheet/modal)

## File Structure to Update

```
client/src/
  components/
    SearchBarEnhanced.tsx     → Rewrite with map integration
    Map.tsx                   → Add zoom listener, lazy-load
    App.tsx                   → Remove CategoryFilterChips, restructure layout
    CategoryFilterChips.tsx   → REMOVE or hide
  lib/
    api.ts                    → Add bbox filtering
```

## Server-Side
- `/api/search` endpoint needs fixing
- `/api/businesses?bbox=...` should work properly
- Add pagination support

## Timeline
- This is a 2-3 hour refactor
- Start with: SearchBar integration
- Then: Remove category bar
- Then: Lazy-loading logic
- Finally: Search UX improvements

## Notes
- Google Maps approach: minimal UI, full map, search on demand
- Don't load all data upfront
- Performance is key (use zoom as signal)
- Proper error handling for failed API calls
