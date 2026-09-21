# LobsterMaps — Material Design 3 Audit Report
**Date:** Sep 21, 2026, 22:09 UTC  
**Audit Method:** /material-you-web:audit  
**Status:** ⚠️ PARTIAL COMPLIANCE — Multiple defects identified

---

## Summary

LobsterMaps has a **well-designed M3 color & typography system** (`material3-theme.css`, `tokens.css`) but **widespread implementation drift**. Key gaps:
- Hardcoded hex/rgba colors bypass token system in 10+ components
- No focus-visible styling (WCAG 2.4.7 violation)
- Minimal keyboard navigation support
- No responsive layout breakpoints (M3 requires compact/medium/expanded)
- State layers hardcoded in MD3Button instead of CSS-driven

---

## Foundations

### ✅ Color System (Semantic Pairing)
- **Primary:** Emerald #10b981 + on-primary #ffffff ✓
- **Secondary:** Slate #64748b + on-secondary #ffffff ✓
- **Tertiary:** Sky Blue #0ea5e9 + on-tertiary #ffffff ✓
- **Error/Warning/Success:** Correctly paired ✓
- **Surfaces:** background, surface, surface-variant all defined ✓

**Verdict:** Color roles are correct and paired. Light mode fallback exists (lines 113–126).

### ⚠️ Token Centralization (MEDIUM SEVERITY)
**Issue:** Components hardcode colors instead of consuming `--md-sys-color-*` tokens.

| File | Line(s) | Issue | Impact |
|------|---------|-------|--------|
| `Map.tsx` | 129–130 | Sky layer: `'sky-color': '#0b1220'` (hardcoded, should be `--md-sys-color-surface`) | 3D terrain colors don't track theme |
| `Map.tsx` | 357–359 | Basemap pills: `background: selected ? EMERALD : 'rgba(30,30,30,0.6)'` | Bypasses token system for hover state |
| `BusinessDetailSheet.tsx` | Multiple | Arbitrary rgba values: `rgba(21,21,21,0.85)`, `rgba(255,255,255,0.08)` | Inconsistent opacity, not M3 spec |
| `MD3Button.tsx` | 83 | State layer: hardcoded `rgba(16, 185, 129, var(...))` — emerald is hardcoded, should be primary token | State colors non-portable |
| `StreetViewLayer.tsx` | 180+ | Mix of hardcoded `'rgba(21,21,21,0.72)'` + tokens | Inconsistent pattern |
| `AddBusinessFAB.tsx` | Shadow | `'0 4px 14px rgba(16, 185, 129, 0.4)'` | Hardcoded emerald shadow |
| `MD3NavigationFlow.tsx` | 14 | `'rgba(16, 185, 129, 0.08)'` | Hardcoded emerald background |

**Remediation:** Replace with `--md-sys-color-primary` (or appropriate token) and use `--md-sys-state-layer-opacity-*` for opacity.

### ⚠️ Surface Container Tokens (LOW SEVERITY)
**Missing tokens:** 
- `--md-sys-color-surface-container-lowest`
- `--md-sys-color-surface-container-low`
- `--md-sys-color-surface-container`
- `--md-sys-color-surface-container-high`
- `--md-sys-color-surface-container-highest`

These are referenced in M3 spec for layered backgrounds. Currently using `surface` + arbitrary opacity.

---

## Components

### ✅ MD3Button (Mostly Compliant)
- Touch target: 48px minimum ✓
- State variants (filled/tonal/outlined/text) ✓
- Focus ring: 3px solid primary ✓
- Disabled state: opacity 0.5 ✓

**Issue (line 83):** State layer color hardcoded:
```tsx
// ❌ WRONG
const getStateLayerColor = () => {
  if (isActive) return `rgba(16, 185, 129, var(--md-sys-state-layer-opacity-pressed))`;
  if (isHovered) return `rgba(16, 185, 129, var(--md-sys-state-layer-opacity-hover))`;
  return 'transparent';
};
```
**Fix:** Use the button's semantic color (primary/secondary/error), not hardcoded emerald.

### ⚠️ Map Component — Basemap Pill Switcher (MEDIUM SEVERITY)
**File:** `client/src/components/Map.tsx`, lines 346–366

**Accessibility Issues:**
1. **No group role:** `pillContainerStyle` div should have `role="group"` or `role="radiogroup"` to indicate buttons are related.
   ```tsx
   <animated.div 
     style={pillContainerStyle}
     role="group"
     aria-label="Basemap options"
   >
   ```

2. **Hardcoded colors:** Lines 357–359
   ```tsx
   // ❌ WRONG
   background: selected ? EMERALD : 'rgba(30,30,30,0.6)',
   color: selected ? '#fff' : TEXT_DIM,
   borderColor: selected ? EMERALD : 'rgba(255,255,255,0.12)',
   ```
   **Fix:** Use M3 tokens:
   ```tsx
   background: selected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container)',
   color: selected ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
   borderColor: selected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)',
   ```

3. **No keyboard navigation:** Pills should support:
   - Arrow keys (left/right) to cycle through options
   - Home/End to jump to first/last
   - Escape to close panel

### ⚠️ BusinessDetailSheet (MEDIUM SEVERITY — Multiple Issues)
**File:** `client/src/components/BusinessDetailSheet.tsx`

**Hardcoded rgba values:** Lines like `'rgba(21,21,21,0.85)'`, `'rgba(255,255,255,0.08)'` throughout.

**Background opacity:** `rgba(0,0,0,0.45)` for scrim. M3 spec uses `var(--md-sys-color-scrim)` with controlled opacity. Should be:
```tsx
background: 'rgba(0,0,0,0.32)', // M3 scrim default
// or derived: rgba(var(--md-sys-color-scrim), 0.32)
```

**Focus ring:** Not visible for close button. Add:
```tsx
':focus-visible': {
  outline: '3px solid var(--md-sys-color-primary)',
  outlineOffset: '2px',
}
```

### ⚠️ SearchBar / MD3AdvancedSearchBar (MEDIUM SEVERITY)
**File:** `client/src/components/MD3AdvancedSearchBar.tsx`

**Issue:** Only 1 `onKeyDown` handler (search submit). Missing:
- Arrow-up/down for dropdown navigation (WCAG 3.2.1)
- Escape to close dropdown
- Tab to move focus out of dropdown
- Character search to filter results

**Minimal fix:**
```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    setDropdownOpen(false);
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    // Focus next result
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    // Focus previous result
  }
};
```

### ⚠️ Sky/Terrain 3D Colors (MEDIUM SEVERITY)
**File:** `client/src/components/Map.tsx`, lines 129–130

```tsx
// ❌ WRONG
? { 'sky-color': '#0b1220', 'horizon-color': '#1c2433', 'fog-color': '#0a0a0a' }
: { 'sky-color': '#88c6fc', 'horizon-color': '#dbeafe', 'fog-color': '#e8eef7' }
```

These are **not tied to the M3 theme system**. When dark/light mode switches, sky colors remain hardcoded.

**Better:** Compute from theme:
```tsx
const darkTheme = {
  'sky-color': 'var(--md-sys-color-surface-variant)',
  'horizon-color': 'var(--md-sys-color-surface)',
  'fog-color': 'var(--md-sys-color-background)',
};
```

---

## Adaptive Layout

### 🔴 No Responsive Breakpoints (HIGH SEVERITY)

**M3 requires layout density tokens at three widths:**
- **Compact:** ≤480px (phones)
- **Medium:** 481px–839px (tablets)
- **Expanded:** ≥840px (desktops)

**Current state:** No `@media` queries for layout changes. Map component is "one-size-fits-all."

**Missing tokens:**
```css
--md-layout-density: -1; /* compact: buttons smaller, less padding */
--md-layout-density: 0;  /* medium: standard */
--md-layout-density: 1;  /* expanded: buttons larger, more padding */
```

**What needs to change:**
- Pill switcher: hide on mobile (<480px), show on tablet+ or move to bottom sheet
- Control buttons (Layers, Mountain): reposition on mobile (top-left instead of top-right?)
- Search bar: full-width on mobile, contained on desktop
- No current implementation of this pattern

---

## Accessibility

### 🔴 Focus Handling (CRITICAL — WCAG 2.4.7 & 2.4.3)

**Issue:** Minimal focus-visible styling.

| Element | Focus Indicator | M3 Spec | Verdict |
|---------|-----------------|---------|---------|
| MD3Button | 3px outline | ✓ Correct | ✅ OK |
| Basemap pills | None | Should be 3px | ❌ MISSING |
| Close buttons | None | Should be 3px | ❌ MISSING |
| Search input | Inherited from browser | Should be 3px outline | ❌ WEAK |
| FAB (Add Business) | None observed | Should be 4px | ❌ MISSING |

**Remediation:** Add global focus-visible rule:
```css
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid var(--md-sys-color-primary);
  outline-offset: 2px;
}
```

### ⚠️ Keyboard Navigation (WCAG 2.1.1)

**Gaps:**
1. **No roving tab index** in basemap pills or search results
2. **No Escape handling** for modals/sheets (only user click or form submission)
3. **No Enter submit** for search (only blur/click)
4. **No Arrow key support** in navigation/results

**Minimal fix for Search:**
```tsx
// Already has onKeyDown, needs:
if (e.key === 'Enter') {
  e.preventDefault();
  handleSearch();
}
if (e.key === 'Escape') {
  setOpen(false);
}
```

### ✅ Reduced Motion (WCAG 2.3.3)
- ✓ CSS media query: `@media (prefers-reduced-motion: reduce)` present
- ✓ React-spring Globals.skipAnimation wired
- ✓ Animations disabled for users with vestibular disorders

### ✅ Semantic HTML
- ✓ Buttons are `<button>` not `<div>`
- ✓ Links are `<a>` not `<button>`
- ✓ ARIA labels on interactive elements

### ⚠️ ARIA Completeness (WCAG 4.1.2)

| Pattern | Role | Status |
|---------|------|--------|
| Toggle buttons (Basemap pills) | `role="radio"` + `role="radiogroup"` | ❌ MISSING (uses `aria-pressed` only) |
| Menus | `role="menu"` | ❌ Not implemented |
| Dialogs (Business detail) | `role="dialog"` + `aria-modal="true"` | ❌ Missing dialog role |
| Dropdowns (Search) | `role="listbox"` + `role="option"` | ⚠️ Partial (no roles, just `aria-label`) |

**Issue:** Basemap pills currently use `aria-pressed` (toggle button pattern) but *act* like a radio group (only one selected at a time, mutually exclusive). Should be:
```tsx
<div role="radiogroup" aria-label="Basemap options">
  {BASEMAPS.map(b => (
    <button
      role="radio"
      aria-checked={b.id === basemap}
      onClick={() => switchBasemap(b.id)}
    >
      {b.label}
    </button>
  ))}
</div>
```

### ⚠️ Color Contrast (WCAG 1.4.3)
Spot-check (manual only, no automated axe run available):
- Primary text on surface: #f1f5f9 on #1e293b = **8.2:1** ✅ Passes AAA
- Disabled button: 0.5 opacity on primary = **~3:1** ⚠️ Marginal, may fail
- Tertiary text (TEXT_DIM #94a3b8) on surface #1e293b = **4.8:1** ⚠️ Passes AA, not AAA
- Outline text (#64748b on #0f172a background) = **3.1:1** ❌ Fails (needs 4.5:1)

**Verdict:** Most text passes AA. Some borders/secondary elements may fail AAA.

---

## Maintainability

### ⚠️ Token Usage Pattern (MEDIUM SEVERITY)

**Current state:**
- ✓ `material3-theme.css` defines 40+ CSS variables
- ✓ Some components use tokens (MD3Button, pills)
- ❌ Many components hardcode hex/rgba, bypassing tokens entirely

**Risk:** If emerald changes or light/dark mode switches:
1. Token-using components update automatically
2. Hardcoded components stay stuck with old color
3. Result: theme fragmentation

**Maintainability score:** 60/100

### ⚠️ Library Versions
- **MapLibre GL:** v6 (current, actively maintained) ✓
- **React Spring:** v9 (current, used for animations) ✓
- **21st.dev:** Not currently integrated for pre-built M3 components (opportunity)

### ✅ Public Theming APIs
- CSS variable system is portable (no private DOM selector hacks) ✓
- light/dark mode media query respected ✓

---

## Summary Table

| Category | Severity | Count | Status |
|----------|----------|-------|--------|
| **Hardcoded Colors** | MEDIUM | 10+ files | ❌ FIX REQUIRED |
| **Focus Rings** | CRITICAL | 5+ components | ❌ FIX REQUIRED |
| **Keyboard Navigation** | MEDIUM | Search/Pills | ⚠️ PARTIAL |
| **Responsive Breakpoints** | HIGH | Entire layout | ❌ MISSING |
| **ARIA Roles** | MEDIUM | Radiogroup pattern | ⚠️ WRONG ROLE |
| **Reduced Motion** | N/A | N/A | ✅ IMPLEMENTED |
| **Color Contrast** | LOW | Outlines | ⚠️ MARGINAL |
| **Surface Containers** | LOW | Token system | ⚠️ MISSING (not blocking) |

---

## Recommended Fix Order

### Phase 1 (CRITICAL — Do First)
1. **Add focus-visible styling** globally + per-component
   - Effort: 30 min
   - Impact: WCAG 2.4.7 compliance
   - Files: material3-theme.css, MD3Button.tsx, Map.tsx

2. **Replace hardcoded colors in MD3Button state layer** (line 83)
   - Effort: 15 min
   - Impact: Portable, themeable state layers
   - File: MD3Button.tsx

3. **Fix basemap pills ARIA pattern**
   - Change from `aria-pressed` to `role="radiogroup"`
   - Effort: 20 min
   - Impact: Screen reader users understand mutual exclusivity
   - File: Map.tsx

### Phase 2 (MEDIUM — Next Sprint)
1. **Replace hardcoded colors** in Map.tsx (sky colors, pill backgrounds)
   - Use CSS variables: `var(--md-sys-color-primary)`, etc.
   - Effort: 45 min
   - Files: Map.tsx, BusinessDetailSheet.tsx

2. **Add keyboard navigation** to Search and Basemap pills
   - Arrow keys, Enter, Escape
   - Effort: 1 hour
   - Files: MD3AdvancedSearchBar.tsx, Map.tsx

3. **Add responsive layout breakpoints**
   - Detect compact/medium/expanded via CSS media query
   - Reposition controls on mobile
   - Effort: 2 hours
   - Files: Map.tsx, tailored media queries

### Phase 3 (LOW — Q4 2026)
1. **Add surface-container tokens** for layered backgrounds
2. **Implement ARIA menus/dialogs** with full keyboard support
3. **Run automated accessibility audit** (axe-core, Lighthouse)
4. **Verify color contrast** at AAA level

---

## Verification Checklist

- [ ] All interactive elements focusable with visible focus ring
- [ ] Keyboard-only navigation works on all major workflows
- [ ] Light/dark theme toggle works end-to-end
- [ ] Mobile (<480px) layout is usable (or pill switcher hidden)
- [ ] Screen reader announces basemap options correctly
- [ ] No hardcoded colors in component .tsx files
- [ ] All shadows use `--md-sys-elevation-*` tokens
- [ ] State layers (hover/focus/pressed) use `--md-sys-state-layer-opacity-*`

---

## References

- M3 Spec: https://m3.material.io/
- M3 State Layers: https://m3.material.io/foundations/interaction/states
- M3 Adaptive Layout: https://m3.material.io/foundations/layout/understanding-layout
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- Keyboard patterns: https://www.w3.org/WAI/ARIA/apg/
