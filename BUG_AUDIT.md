# LobsterMaps Bug Audit & Remediation

**Date**: Sep 15, 2026 | **Auditor**: Claude bug-scout with Material You web skills

---

## 🔴 CRITICAL BUGS

### BUG #1: JSON Parsing Without Catch (localStorage)
**File**: `client/src/components/MD3AdvancedSearchBar.tsx:36`
**Severity**: HIGH
**Impact**: App crash on corrupted localStorage data

```tsx
// BROKEN:
private getPrefs() {
  const stored = localStorage.getItem(this.storageKey);
  return stored ? JSON.parse(stored) : {};  // ⚠️ No try-catch
}

// FIXED:
private getPrefs() {
  try {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn('Failed to parse preferences:', e);
    return {};
  }
}
```

---

### BUG #2: Hardcoded Hex Colors Break M3 Token System
**Files**: 
- `BusinessDetailSheet.tsx:217` - `#0f0f0f`
- `StreetViewLayer.tsx:138` - `#0a0a0a`
- `AddBusinessModal.tsx:237` - `#0f0f0f`
- `Map.tsx:109-111` - `#fff4e6`, `#0a0a0a`
- `SearchBarEnhanced.tsx:99,105,137` - `#f1f5f9`
- `PlaceDetailSheet.tsx` - 6+ instances of `#10b981`, `#f1f5f9`
- `DirectionsPanel.tsx:58,60` - hardcoded rgba() in DirectionsPanel
- `TripPlanner.tsx:310,342,392` - `#0f0f0f`, `#0a0a0a`

**Severity**: CRITICAL
**Impact**: 
- Dark/light theme toggle won't work
- Accessibility: no contrast checking against semantic roles
- Violates M3 spec requirement: all colors must use `--md-sys-color-*` or `--app-color-*` tokens

**Fix Pattern**:
```tsx
// BROKEN:
background: '#0f0f0f'
color: '#f1f5f9'

// FIXED:
background: 'var(--md-sys-color-surface-container-high)'
color: 'var(--md-sys-color-on-surface)'
```

**Mapping Guide**:
- `#0a0a0a`, `#0f0f0f` → `var(--md-sys-color-surface-container-high)` (dark)
- `#f1f5f9` → `var(--md-sys-color-on-surface)` (light text)
- `#10b981` → `var(--md-sys-color-primary)`
- `#1c1917` → `var(--md-sys-color-on-background)`

---

### BUG #3: State Layers Use Tailwind, Not M3 Opacity Spec
**File**: `client/src/components/MD3Button.tsx:30-47`
**Severity**: HIGH
**Impact**: Hover/focus/pressed states violate M3 contrast & accessibility rules

M3 spec requires state layer opacities:
- Hover: 8%
- Focus: 12%
- Pressed: 12%
- Drag: 16%
- Selected: 8%

```tsx
// BROKEN - using arbitrary tailwind opacity:
hover:bg-emerald-500/10  /* = 40% opacity, wrong */
active:bg-emerald-500/20 /* = 50% opacity, wrong */

// FIXED - using M3 state layer tokens:
--md-sys-state-hover-opacity: 0.08
--md-sys-state-focus-opacity: 0.12
--md-sys-state-pressed-opacity: 0.12
--md-sys-state-drag-opacity: 0.16
--md-sys-state-selected-opacity: 0.08

Then in CSS:
background: rgb(from var(--md-sys-color-primary) r g b / var(--md-sys-state-hover-opacity))
```

---

### BUG #4: No Reduced-Motion Support (WCAG Violation)
**File**: `client/src/styles/tokens.css`
**Severity**: HIGH (Accessibility)
**Impact**: Users with vestibular disorders forced to view animations

**Missing**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Required in all animation-using components**:
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// In animation:
animation: prefersReducedMotion ? 'none' : 'spin 1s linear infinite',
```

---

## 🟠 HIGH-PRIORITY BUGS

### BUG #5: Missing M3 Responsive Breakpoints
**File**: `client/src/styles/tokens.css`
**Severity**: MEDIUM
**Impact**: No compact/medium/expanded layout behavior per M3 spec

M3 requires:
```css
:root {
  /* Compact (narrow phones): <480px */
  --md-layout-density: compact;
  
  /* Medium (tablets): 600-840px */
  --md-layout-density: medium;
  
  /* Expanded (desktop): >840px */
  --md-layout-density: expanded;
}

@media (max-width: 479px) {
  :root { --md-layout-density: compact; }
}

@media (min-width: 480px) and (max-width: 839px) {
  :root { --md-layout-density: medium; }
}

@media (min-width: 840px) {
  :root { --md-layout-density: expanded; }
}
```

---

### BUG #6: Borders & Shadows Using Tailwind, Not M3 Tokens
**Files**: Multiple components
**Severity**: MEDIUM
**Impact**: Inconsistent elevation, no semantic meaning

Examples:
- `border-slate-700` → `var(--md-sys-color-outline-variant)`
- `shadow-lg` → `var(--md-sys-elevation-shadow-5)`
- `rounded-lg` → `var(--md-sys-shape-corner-medium)` (M3: 12px)

---

### BUG #7: Focus Rings Using Tailwind, Not M3 Spec
**File**: `client/src/components/MD3Button.tsx:75-76`
**Current**:
```tsx
focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2
```

**Should be**:
```css
&:focus-visible {
  outline: 3px solid var(--md-sys-color-primary);
  outline-offset: 2px;
}
```

---

### BUG #8: Touch Targets Inconsistent (M3: 48dp min)
**Severity**: MEDIUM (Accessibility)
**Locations**: Various buttons, FAB, interactive elements

Audit findings:
- ✅ FAB: 56px (correct)
- ❌ Terrain button: 40px (should be 48px)
- ❌ Map controls: mixed sizes
- ❌ Search input: 44px (should be 48px)

---

### BUG #9: DirectionsPanel Visibility Logic Unclear
**File**: `client/src/App.tsx:397`, `DirectionsPanel.tsx:35`
**Issue**: `routes={tripPlannerOpen ? [] : undefined}` suggests conditional showing

Current logic:
```tsx
// App.tsx:
const to = typeof tripPlannerTo === 'string' ? tripPlannerTo : undefined;
const routes = tripPlannerOpen ? [] : undefined;

// DirectionsPanel.tsx:
if (!to && !loading) return null;
```

**Problem**: When `tripPlannerOpen=false` and routes=undefined, panel still renders if `to` is set.

**Fix**:
```tsx
// Only show when user explicitly opened directions
if (!tripPlannerOpen || (!to && !loading)) return null;
```

---

## 🟡 MEDIUM-PRIORITY BUGS

### BUG #10: Unprotected Async JSON Parsing
**Files**: 
- `SearchBarEnhanced.tsx:44` (has try-catch ✅)
- `StreetViewLayer.tsx:86` (has try-catch ✅)
- `MD3AdvancedSearchBar.tsx:36` (NO try-catch ❌)

All async JSON ops need protection:
```tsx
try {
  const data = await res.json();
  // use data
} catch (err) {
  console.error('JSON parse failed:', err);
  // handle error gracefully
}
```

---

### BUG #11: API Errors Don't Check `res.ok` Consistently
**Files**: `client/src/lib/api.ts`
**Good**: `fetchBusinessesInView`, `fetchBusinessById`, `submitBusiness` check `res.ok`
**Bad**: No timeout handling, no network error recovery

Add:
```tsx
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Request timeout')), 5000)
);

try {
  const res = await Promise.race([fetch(...), timeoutPromise]);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
} catch (err) {
  console.error('API call failed:', err);
  throw err;
}
```

---

### BUG #12: No Semantic HTML in Detail Sheets
**Files**: `PlaceDetailSheet.tsx`, `BusinessDetailSheet.tsx`
**Impact**: Accessibility tools can't parse structure

Should use:
```tsx
<article>
  <header><h1>{name}</h1></header>
  <section><address>{address}</address></section>
  <section><dl>...</dl></section>
</article>
```

---

## 🟢 LOW-PRIORITY (Nice to Have)

### BUG #13: No Loading State Skeleton Screens
Missing: Visual feedback while loading business details, directions

### BUG #14: Route Cache Key Doesn't Account for Mode
`cacheRoute` uses only coordinates, should include "car"/"transit" mode

### BUG #15: Marker Diffing Algorithm (syncMarkers) Inefficient
Could use spatial hashing instead of distance loop

---

## ✅ ALREADY FIXED (This Session)

- ✅ MapLibre v6 XSS vulnerability (GHSA-jrc7-96c5-q579)
- ✅ Weather symbol-code WASM conversion
- ✅ Route cache departure-time key
- ✅ Saved map view restoration (center + zoom)
- ✅ Route persistence across style changes

---

## 🚀 Remediation Priority

**PHASE 1 (Blocker - must fix before deploy)**:
1. BUG #2: Replace all hardcoded hex colors with M3 tokens (~2 hours)
2. BUG #1: Add try-catch to MD3AdvancedSearchBar (5 min)
3. BUG #9: Fix DirectionsPanel visibility logic (15 min)

**PHASE 2 (Required for M3 compliance - fix in next sprint)**:
1. BUG #3: State layer opacities to M3 spec (1 hour)
2. BUG #4: Add reduced-motion support (30 min)
3. BUG #5: Responsive breakpoint tokens (1 hour)

**PHASE 3 (Accessibility - Q1 2027)**:
1. BUG #6-8: Borders, shadows, touch targets
2. BUG #12: Semantic HTML refactor
3. BUG #13-15: Performance/UX refinements

---

## Test Checklist

- [ ] Dark mode toggle works (all components)
- [ ] Reduced motion respected (no animations)
- [ ] Touch targets all ≥48px
- [ ] Focus rings visible on keyboard nav
- [ ] No console errors on localStorage corruption
- [ ] Search results load without JSON parse crashes
- [ ] DirectionsPanel hidden when no route selected
- [ ] Contrast ratios pass WCAG AA on all states
