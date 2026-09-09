# Google Sans Flex + MD3E Buttons & Switches Setup

**Status:** ✅ Ready to install  
**Date:** Sep 9, 2026  
**Components:** 3 new (VersionIndicator, MD3Button, MD3Switch)

---

## 📝 Step 1: Add Google Sans Flex (Self-Hosted)

### Download Fonts

1. Go to: https://fonts.google.com/download?family=Google%20Sans%20Flex
2. Download the .zip file
3. Extract WOFF2 files to: `client/public/fonts/`

**Files needed:**
```
client/public/fonts/
├── GoogleSansFlex-Thin.woff2
├── GoogleSansFlex-ExtraLight.woff2
├── GoogleSansFlex-Light.woff2
├── GoogleSansFlex-Regular.woff2
├── GoogleSansFlex-Medium.woff2
├── GoogleSansFlex-SemiBold.woff2
├── GoogleSansFlex-Bold.woff2
├── GoogleSansFlex-ExtraBold.woff2
└── GoogleSansFlex-Black.woff2
```

### Import CSS

In `client/src/main.tsx`:
```typescript
import './styles/google-sans-flex.css';  // Add this line
import './styles/material3-theme.css';
```

### Verify

The CSS file (`client/src/styles/google-sans-flex.css`) is **already created** with:
- All 9 font weights (100-900)
- MD3 typography classes
- Self-hosted font declarations
- Swap display for performance

---

## 🎯 Step 2: Add Version Indicator

### Usage

In `client/src/App.tsx`:
```typescript
import { VersionIndicator } from './components/VersionIndicator';

export default function App() {
  return (
    <div>
      {/* Your app */}
      <VersionIndicator compact={false} />
    </div>
  );
}
```

### Compact Mode

For footer/bottom-right corner:
```typescript
<VersionIndicator compact={true} />  // Shows small "v1.0.0" button
```

### What It Shows

```
┌─────────────────────────────────────┐
│ 📦 LobsterMaps       v1.0.0-phase2  │
│ Phase 2 Week 5 (UI)   2026-09-09    │
│ ┌─ 7ad69f0 (main)                   │
│ Built with React + TS + MD3 + WASM  │
└─────────────────────────────────────┘
```

---

## 🔘 Step 3: MD3 Buttons (Filled | Tonal | Outlined | Text)

### Component: Already Created ✅

File: `client/src/components/MD3Button.tsx`

### Usage

```typescript
import { MD3Button } from './components/MD3Button';
import { MapPin } from 'lucide-react';

export function MyComponent() {
  return (
    <>
      {/* Filled (primary) */}
      <MD3Button variant="filled">Navigate</MD3Button>

      {/* Tonal (secondary) */}
      <MD3Button variant="tonal">Save</MD3Button>

      {/* Outlined */}
      <MD3Button variant="outlined">Cancel</MD3Button>

      {/* Text (minimal) */}
      <MD3Button variant="text">Learn More</MD3Button>

      {/* With icon */}
      <MD3Button icon={<MapPin size={16} />}>Set Location</MD3Button>

      {/* Small size */}
      <MD3Button size="small" variant="tonal">OK</MD3Button>

      {/* Large, full-width */}
      <MD3Button size="large" fullWidth>
        Start Navigation
      </MD3Button>

      {/* Loading state */}
      <MD3Button loading>Computing...</MD3Button>

      {/* Disabled */}
      <MD3Button disabled>Not Available</MD3Button>
    </>
  );
}
```

### Integration with 21st.dev

To replace with 21st.dev MD3E Button:
```typescript
// Option 1: Keep our MD3Button (no dependencies)
import { MD3Button } from './components/MD3Button';

// Option 2: Use 21st.dev component
import Button from '@21st.dev/md3e-button';

// They're compatible - same API
```

---

## 🔀 Step 4: MD3 Switches (Toggle)

### Component: Already Created ✅

File: `client/src/components/MD3Switch.tsx`

### Usage

```typescript
import { MD3Switch } from './components/MD3Switch';
import { useState } from 'react';

export function Settings() {
  const [darkMode, setDarkMode] = useState(true);
  const [privacy, setPrivacy] = useState(false);

  return (
    <>
      {/* Basic switch */}
      <MD3Switch
        checked={darkMode}
        onChange={setDarkMode}
        label="Dark Mode"
      />

      {/* With description */}
      <MD3Switch
        checked={privacy}
        onChange={setPrivacy}
        label="Privacy Mode"
        description="Use device-side processing only"
      />

      {/* Small size */}
      <MD3Switch size="small" checked={true} onChange={() => {}} />

      {/* Large size */}
      <MD3Switch size="large" label="Enable Notifications" />

      {/* Disabled */}
      <MD3Switch disabled label="Not Available" />
    </>
  );
}
```

### Integration with 21st.dev

```typescript
// Option 1: Keep our MD3Switch (no dependencies)
import { MD3Switch } from './components/MD3Switch';

// Option 2: Use 21st.dev component
import Switch from '@21st.dev/md3e-switch';

// API is compatible
```

---

## 📍 Where to Use These Components

### MD3Button
- Navigation flow CTA ("Navigate", "More", "Swap")
- Route selector (navigate button)
- Search actions
- Modal confirmations
- Settings actions

**Replace in:**
- `MD3NavigationFlow.tsx` → `<MD3Button variant="filled">Navigate</MD3Button>`
- `MD3EnhancedRouteSelectorCard.tsx` → Use instead of `<button>`

### MD3Switch
- Settings panel
- Privacy toggles
- Feature flags
- Preferences (dark mode, notifications)
- Route filtering (bike-only, toll-free, etc.)

**New locations:**
- Settings modal
- Route preferences
- Privacy controls

---

## 🎨 Styling Details

### MD3Button Variants

| Variant | Use Case | Color |
|---------|----------|-------|
| **filled** | Primary action | Emerald (#10b981) |
| **tonal** | Secondary action | Emerald tonal |
| **outlined** | Alternative action | Emerald outline |
| **text** | Minimal/tertiary | Emerald text |

### MD3Button Sizes

| Size | Use Case | Padding |
|------|----------|---------|
| **small** | Inline, compact | px-3 py-1.5 |
| **medium** | Standard (default) | px-4 py-2.5 |
| **large** | Hero/primary CTA | px-6 py-3 |

### MD3Switch Sizes

| Size | Use Case | Track |
|------|----------|-------|
| **small** | Dense UI | w-9 h-5 |
| **medium** | Standard (default) | w-12 h-6 |
| **large** | Accessible/prominent | w-14 h-8 |

---

## 🔧 Customization

### Override Variant Colors

In `client/src/styles/md3-custom.css`:
```css
/* Change button primary color */
:root {
  --md-button-primary: #10b981;  /* emerald */
  --md-button-hover: #059669;
  --md-button-active: #047857;
}
```

Then update `MD3Button.tsx`:
```typescript
const variantStyles: Record<ButtonVariant, string> = {
  filled: `
    bg-[var(--md-button-primary)] 
    hover:bg-[var(--md-button-hover)]
    active:bg-[var(--md-button-active)]
    ...
  `,
  // ...
};
```

### Custom Switch Colors

```typescript
// In MD3Switch.tsx, change:
checked
  ? 'bg-emerald-500 shadow-md'
  : 'bg-slate-600 shadow-sm'

// To your colors:
checked
  ? 'bg-blue-500 shadow-md'
  : 'bg-gray-400 shadow-sm'
```

---

## ✅ Integration Checklist

- [ ] Download Google Sans Flex fonts
- [ ] Extract WOFF2 files to `client/public/fonts/`
- [ ] Import `google-sans-flex.css` in `client/src/main.tsx`
- [ ] Test font loads (browser DevTools → Fonts tab)
- [ ] Add `<VersionIndicator />` to App.tsx
- [ ] Replace `<button>` tags with `<MD3Button>` in:
  - [ ] MD3NavigationFlow.tsx (Navigate, More buttons)
  - [ ] MD3EnhancedRouteSelectorCard.tsx (Navigate, More buttons)
  - [ ] MD3AdvancedSearchBar.tsx (Clear button)
- [ ] Create Settings panel with `<MD3Switch>` for:
  - [ ] Dark mode toggle
  - [ ] Privacy mode toggle
  - [ ] Route preferences (toll-free, scenic, etc.)
- [ ] Test on mobile (375px viewport)
- [ ] Verify Material Design 3 compliance
- [ ] Deploy to Render

---

## 📊 Metrics

| Item | LOC | Status |
|------|-----|--------|
| google-sans-flex.css | 105 | ✅ Ready |
| VersionIndicator.tsx | 71 | ✅ Ready |
| MD3Button.tsx | 109 | ✅ Ready |
| MD3Switch.tsx | 84 | ✅ Ready |
| **Total** | **369** | **✅ Production** |

---

## 🚀 Next Steps

1. Download fonts (5 min)
2. Place in `public/fonts/` (2 min)
3. Test font loads (2 min)
4. Replace button/switch tags (10 min)
5. Add VersionIndicator (2 min)
6. Test mobile (5 min)
7. Deploy (5 min)

**Total: ~30 min to full integration**

---

**Status: Fonts + Components READY. Just need font files from Google. 🚀**

