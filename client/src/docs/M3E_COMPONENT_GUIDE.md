# Material 3 Expressive Component Guide
**Docs:** https://matraic.github.io/m3e/ | **Source:** https://github.com/matraic/m3e

## All Available Components (v2.7.9)

### Navigation
- **Nav Rail** - Side navigation with icons + labels (vertical, scrollable, selection)
- **Nav Bar** - Bottom navigation bar
- **Nav Menu** - Vertical menu with grouping
- **Breadcrumb** - Page hierarchy navigation
- **Toolbar** - Floating pill or docked action bar (✅ implemented)

### Inputs & Forms
- **Autocomplete** - Searchable dropdown with type-ahead
- **Search** - Full search field with suggestions
- **Stepper** - Multi-step form wizard
- **Date Input** / **Datepicker** - Date selection
- **Timepicker** - Time selection
- **Slider** / **Slider Dual** - Range input
- **Radio Group** - Single-select options
- **Checkbox** - Multi-select options
- **Switch** - Toggle on/off
- **Select** - Dropdown select
- **Textarea Autosize** - Expanding text area

### Containers & Layout
- **Card** - Content container with shadow/elevation
- **List** - Vertical item list with dividers
- **Dialog** - Modal overlay
- **Bottom Sheet** - Bottom-anchored modal
- **Drawer Container** - Side drawer layout
- **Expansion Panel** - Collapsible sections
- **Content Pane** - Responsive content wrapper
- **Split Pane** - Resizable two-column layout

### Feedback
- **Loading Indicator** - Spinner/progress (✅ keep existing)
- **Progress Indicator** - Progress bar/circle
- **Skeleton** - Placeholder loading state (need to add)
- **Snackbar** - Toast notifications
- **Badge** - Count/notification badge
- **Tooltip** - Hover tooltip

### Actions
- **Button** - Primary, tonal, outlined, elevated, text
- **Button Group** - Grouped buttons (need for card actions)
- **Icon Button** - Icon-only button
- **FAB** - Floating action button
- **FAB Menu** - FAB with submenu (replace green add button)
- **Split Button** - Button + dropdown
- **Menu** - Context menu / popup menu
- **Segmented Button** - Radio-style button group (satellite/3D toggle)

### Media & Display
- **Avatar** - User profile picture
- **Icon** - Material Symbols icon
- **Image** - Responsive image container
- **Video** - Video player

## LobsterMaps Implementation Order (PRIORITY)

### TIER 1 - Ship This Sprint
1. **Fix MapTiler VITE_KEY issue** - Validate key in Render dashboard
2. **Nav Rail** - Left sidebar navigation (browse categories, saved places)
3. **FAB Menu** - Replace green add button (add business / add location / report)
4. **Segmented Button** - Satellite / 3D mode toggle (remove options dialog)
5. **Breadcrumb** - Location hierarchy at top
6. **Skeleton** - Loading placeholder (map background, keep spinner)
7. **Search** - Enhanced search with autocomplete suggestions
8. **Card** - Business detail card
9. **Button Group** - In card: bus/walk/car/share/call/website

### TIER 2 - Next Sprint
- **Stepper** - Add business multi-step form
- **Autocomplete** - Category selection
- **Switch** - Day/night mode toggle
- **Tree** - Hierarchical location browser

### TIER 3 - Polish
- **Bottom Sheet** - Mobile business detail
- **Dialog** - Confirm deletions
- **Snackbar** - Toast feedback
- **Expansion Panel** - Business hours/reviews

## Component Substitutions

| Existing | Replace With | Reason |
|----------|--------------|--------|
| Green "+" button | FAB Menu | Morphing animation, grouped actions |
| 3D button menu | Segmented Button | Cleaner UI, fewer options |
| Basemap dropdown | Nav Rail item | Better UX, integrated nav |
| Custom search | Search + Autocomplete | Type-ahead, suggestions |
| Business list | List + Card | M3E styling, accessibility |

## Design System Checklist

### Shapes (M3E shape family)
- Full (FAB, pills): 9999px
- XL (cards): 28px
- LG (buttons): 12px
- MD (chips): 8px
- SM (icon buttons): 4px

### Motion (spring physics)
- Expand/collapse: `cubic-bezier(0.35, 1.1, 0.6, 1)` / 350ms
- Dialog: `cubic-bezier(0.4, 0, 0.2, 1)` / 200ms

### Elevation (shadows 0-5)
- 0: None (flat)
- 1: Small (cards)
- 2: Medium (input focus)
- 3: Floating (toolbar, FAB)
- 4: Modal (dialogs)
- 5: Top-level (alerts)

### Token Usage
Always use CSS variables:
- Colors: `var(--md-sys-color-*)`
- Shapes: `var(--md-sys-shape-*)`
- Motion: `var(--md-sys-motion-*)`
- Elevation: `var(--md-sys-elevation-*)`

## Key Decisions

1. **No M3E package dependency** - We implement from spec, not npm
2. **CSS-native animations** - No library overhead, 60fps
3. **Semantic HTML** - Accessibility first
4. **Token-driven design** - One source of truth for brand
5. **Progressive enhancement** - Desktop-first, mobile refinements

## References
- https://matraic.github.io/m3e/ (component showcase)
- https://github.com/matraic/m3e (implementation patterns)
- https://m3.material.io/ (design spec, authoritative)
- https://m3.material.io/styles/motion/overview/how-it-works (motion physics)

