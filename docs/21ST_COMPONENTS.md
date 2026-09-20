# LobsterMaps: 21st.dev Component Integration

**Goal:** Leverage 21st.dev MCP for UI components instead of building from scratch  
**Status:** Research complete, components identified, ready to integrate

---

## 🎯 Components to Use

### 1. Route Planner Card (ID: 8349)
**Use for:** Display single route with distance, duration, elevation

**Features:**
- Route info display (duration, distance)
- Animated elevation graph
- Call-to-action button
- Fully customizable

**Where:** RouteResult card in /directions view

**Install:** `npx shadcn@latest add "https://21st.dev/r/ravikatiyar162/planner-card?api_key=$API_KEY_21ST"`

---

### 2. Travel Route Card (ID: 7639)
**Use for:** Multiple route options display

**Features:**
- Travel route information
- Like/save interactions
- Framer-motion animations
- Staggered entrance effects

**Where:** Route alternatives list in multi-criteria results

**Install:** `npx shadcn@latest add "https://21st.dev/r/kavikatiyar/card-7?api_key=$API_KEY_21ST"`

---

### 3. Timeline Rail (ID: 6529)
**Use for:** Transit stops/legs visualization

**Features:**
- Timeline visualization
- Multiple variants
- Step indicators

**Where:** Transit trip details (bus → stop → train → stop)

**Install:** `npx shadcn@latest add "https://21st.dev/r/nayan_radadiya6/timeline-rail?api_key=$API_KEY_21ST"`

---

### 4. Location Card (ID: 7902)
**Use for:** Start/end location display

**Features:**
- Image background
- Animated CTA button
- Responsive, theme-adaptive

**Where:** Route origin/destination cards

**Install:** `npx shadcn@latest add "https://21st.dev/r/lavikatiyar/location-card?api_key=$API_KEY_21ST"`

---

## 🎨 Dark Themes

### Recommended: Darkmatter (slug: `darkmatter`)
- Minimal, professional
- Perfect for maps overlay
- High contrast for readability

### Alternative: Portfolio Pro Dark
- Slightly warmer blacks
- Accent-friendly

---

## Integration Plan

### Phase 2 Week 3 (After Week 2 Completion)

1. **Setup 21st.dev in project**
   - Create `.21st/design.json` with project context
   - Configure shadcn/ui imports

2. **Install components** (in order)
   ```bash
   npm install framer-motion
   npx shadcn@latest add "https://21st.dev/r/ravikatiyar162/planner-card"
   npx shadcn@latest add "https://21st.dev/r/kavikatiyar/card-7"
   npx shadcn@latest add "https://21st.dev/r/nayan_radadiya6/timeline-rail"
   npx shadcn@latest add "https://21st.dev/r/lavikatiyar/location-card"
   ```

3. **Integrate into React components**
   - `client/src/components/RouteCard.tsx` → use Planner Card
   - `client/src/components/AlternativeRoutes.tsx` → use Travel Route Cards
   - `client/src/components/TransitDetails.tsx` → use Timeline Rail
   - `client/src/components/LocationDisplay.tsx` → use Location Card

4. **Apply theme**
   - Set Darkmatter theme palette in global CSS
   - Override with Yr.no weather styling if needed

---

## Why Use 21st.dev?

- **Battle-tested components** → no reinventing wheels
- **Framer-motion animations** → polished UX
- **Fully responsive** → mobile-first
- **Theme-adaptive** → dark mode built-in
- **Time savings** → focus on routing logic, not UI

---

## Credentials (Already Stored)

- GitHub PAT: [REDACTED]
- Render: srv-da77r72d0e5s73dl976g
- Neon: floral-silence-23234233
- 21st.dev: Use MCP connector (already available)

---

## Next Steps

1. ✅ Identify components (DONE)
2. ⏳ Phase 2 Week 2 (routing core)
3. ⏳ Phase 2 Week 3 (UI integration from 21st)
4. ⏳ Verify all components render correctly
5. ⏳ Deploy with new UI

