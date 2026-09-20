# Critical Fixes & Phase 2 Deep Dive (Sep 6)

## 🔴 Issues Found

### 1. Entur Transit Broken
- GraphQL endpoint misbehaving (likely field name mismatch)
- Variables might not be passing correctly
- ET-Client-Name header format needs verification

**Fix:**
- Switch to simpler Entur API (stop-based, not GraphQL)
- Use `/journey-planner/v2/trips` REST endpoint instead
- Coordinates still work, no GraphQL fragility

### 2. Pathfinding is Weak
- A* is fine locally, but routing over real OSM is bad
- Missing: turn restrictions, traffic patterns, road preferences
- No multi-criteria (prefer highways, avoid residential at night)
- Contraction Hierarchies not implemented yet (Phase 2)

**Fix (Phase 2 Week 1-2):**
- Implement CH bidirectional queries (5ms queries)
- Add multi-criteria routing (time-dependent)
- Model truck routes, turn restrictions
- Traffic-aware edge weights

---

## 🚀 Phase 2 Week 2: Multi-Criteria Routing

### Goal
Make pathfinding actually good: fast + smart

### Breakdown
**Day 1-3: CH Bidirectional Queries**
- Implement forward/backward search
- Meeting point detection
- Path reconstruction
- Property-based tests (50+)

**Day 4-5: Multi-Criteria Routing**
- Time-dependent edge weights (rush hour aware)
- Road type preferences (highway > surface > residential)
- Avoid tunnels/ferries in certain conditions
- Pareto-optimal route variants

**Day 6-7: Integration + Benchmarks**
- Integrate into WASM Router
- Benchmark: <5ms queries for Bergen
- Test with real OSM data
- Load test: 100 concurrent queries

---

## 🔌 Transit Fix (Tonight)

Switch from GraphQL to REST:

```typescript
// New: Use Entur REST API (simpler, more reliable)
const ENTUR_REST = 'https://api.entur.io/journey-planner/v2/trips';

export async function getTransitTrip(from, to) {
  const resp = await fetch(ENTUR_REST, {
    method: 'POST',
    headers: { 'ET-Client-Name': 'lobstermaps-directions' },
    body: JSON.stringify({
      from: { place: { coordinates: { latitude: from.lat, longitude: from.lon } } },
      to: { place: { coordinates: { latitude: to.lat, longitude: to.lon } } },
      numTripPatterns: 3,
    }),
  });
  
  const data = await resp.json();
  if (data.tripPatterns) {
    return data.tripPatterns.map(pattern => ({
      startTime: pattern.startTime,
      endTime: pattern.endTime,
      durationSeconds: pattern.duration / 1000,
      legs: pattern.legs.map(leg => ({
        mode: leg.mode.toLowerCase(),
        durationSeconds: leg.duration / 1000,
        distanceMeters: leg.distance,
        lineName: leg.line?.name || null,
      })),
    }))[0] || null;
  }
  return null;
}
```

---

## 📋 Next Priorities

1. **Fix Transit (1 hour)** — REST API instead of GraphQL
2. **Phase 2 Week 2 (8 hours)** — CH + Multi-Criteria
3. **Notion Docs (2 hours)** — Convert all MD to Notion
4. **License (30 min)** — Add AGPL3 (privacy-first projects should be copyleft)

---

## 📄 License

**AGPL-3.0** fits LobsterMaps because:
- Privacy-first code should stay open
- Copyleft prevents proprietary forks
- "If you run it as a service, you must share changes"
- Matches the spirit: privacy for users, not profit for companies

Add to repo: `LICENSE` file (AGPL-3.0 full text)

