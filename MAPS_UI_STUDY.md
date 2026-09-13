# Google Maps & Apple Maps - Deep Dive UI/UX Study

## Google Maps Flow:
1. Search bar top-left, full-width at top
2. Click on place → Info card OPENS at bottom (50% screen)
   - Shows: Photo, rating, hours, reviews, address
   - Has "Directions" button prominent
   - "Save" button
   - Website link
3. Click "Directions" → Full directions panel opens
4. Shows: Car/Transit/Walk options, time/distance
5. Click option → Route drawn on map

## Apple Maps Flow:
1. Search bar top (centered or top-right)
2. Click place → Card opens from SIDE (right panel)
   - Shows: Images carousel, name, rating
   - Details section expandable
3. "Directions" opens directions UI
4. Route options clear + prominent

## Key Patterns:
- Search is ALWAYS accessible
- Place cards are MODAL/SHEET, not overlays
- Pictures/images are FIRST thing shown
- Actions (Navigate, Save, Call) are OBVIOUS
- Directions are SEPARATE from place info
- 3D/Satellite/Street View are MAP CONTROLS

## Info Card Should Have:
1. Image carousel (5-10 images)
2. Name + Rating
3. Address + Phone
4. Hours (open/closed status)
5. Description/Category
6. CTA buttons: Directions, Call, Website, Save
7. Reviews/Rating details
