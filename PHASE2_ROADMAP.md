# Phase 2: Rust/WASM Routing Engine Upgrade

**Goal:** Sub-5ms route calculations with multi-criteria optimization and privacy-first architecture.

---

## **Week 1: Foundation**

### **Day 1-2: Rust/WASM Skeleton & Build Pipeline**
- [ ] `routing-core/Cargo.toml` with wasm-pack config ✓
- [ ] `routing-core/src/lib.rs` with WASM bindings ✓
- [ ] `routing-core/src/graph.rs` (flat array structures) ✓
- [ ] `routing-core/src/ch.rs` (CH algorithm) ✓
- [ ] GitHub Actions: Rust build + WASM compilation
- [ ] Node.js orchestration layer (calls Rust from `/api/route`)

### **Day 3-4: Binary Graph Format**
- [ ] Design: Float64Array for coords, Int32Array for edges
- [ ] Implement: OSM → binary converter in Node.js
- [ ] Test: Load Bergen graph in WASM memory
- [ ] Benchmark: Binary vs JSON load time

### **Day 5-7: Contraction Hierarchies Skeleton**
- [ ] Implement: Node importance ordering algorithm
- [ ] Implement: Shortcut identification (bypasses low-importance nodes)
- [ ] Property-based tests: Ensure shortcuts preserve shortest paths
- [ ] Benchmark: CH precomputation time (target: <5 min for Bergen)

**Deliverable:** Rust/WASM compiles, binary graph loads, CH skeleton ready

---

## **Week 2: Integration & Performance**

### **Day 1-2: CH Query Algorithm**
- [ ] Implement: Bidirectional Dijkstra using CH shortcuts
- [ ] Implement: Node level filtering (only expand higher-level nodes)
- [ ] Test: Query correctness vs A* (should be identical)
- [ ] Benchmark: Target <5ms per route

### **Day 3-4: Node.js Orchestration**
- [ ] Wrap Rust/WASM calls in Node.js
- [ ] Handle binary array marshaling (JS ↔ Rust)
- [ ] Implement fallback: If WASM fails, use Node A*
- [ ] Add feature flag: `USE_RUST_ROUTER=true/false`

### **Day 5-7: Multi-Criteria Routing**
- [ ] Design Pareto-optimal frontier algorithm
- [ ] Implement: Weight vector → multiple objectives (time, cost, risk, elevation)
- [ ] Generate: K-shortest paths using plateau method
- [ ] Return: Top 5 alternatives to frontend

**Deliverable:** Sub-5ms routing working, multi-criteria sketched

---

## **Week 3: Privacy & Bergen Features**

### **Day 1-2: K-Anonymity Spatial Binning**
- [ ] Integrate: Uber H3 hexagonal geometry library
- [ ] Implement: Group concurrent requests by H3 hex cell (resolution 10)
- [ ] Implement: Ensure k ≥ 10 before returning route
- [ ] If k < 10: Cache + batch with future requests

### **Day 3-4: Ephemeral Route Logging**
- [ ] Strip: User ID from POST `/api/route/learn`
- [ ] Anonymous: Aggregate speed observations into time/day buckets
- [ ] Encrypt: IndexedDB storage on client (AES wrapper)
- [ ] Verify: No PII in logs or telemetry

### **Day 5-7: Bergen Toll Ring & Speed Cameras**
- [ ] Load: Toll station coordinates from NVDB (Bompenger)
- [ ] Detect: When route crosses toll point
- [ ] Calculate: Rush-hour toll amount (Statens Vegvesen schedule)
- [ ] Render: Speed camera markers on map (NVDB layer)

**Deliverable:** Privacy stack + Bergen specifics implemented

---

## **Week 4+: Features & Optimization**

### **Next Priorities (In Order)**
1. **Park & Ride (Multi-Modal)**
   - Route car → Bybanen terminal
   - Merge transit schedule into ETA
   - Return combined polyline

2. **Bergen Bysykkel Integration**
   - Query GBFS for dock availability
   - Route car → bike dock + bike path to destination
   - Show real-time dock full/empty status

3. **Departure Time Optimizer**
   - Query Trafikkdata for volume forecasts (E39, Rv555)
   - Suggest optimal departure time (avoid peak)
   - Show impact: "Leave 15 min later, save 8 min"

4. **Redis Caching Layer**
   - Cache all external API calls (Yr.no, Entur, GBFS)
   - Use sensible TTLs: 60sec for bikes, 15min for weather
   - Circuit breaker: Fallback to stale data if upstream down

5. **OpenTelemetry Profiling**
   - Instrument CH query (microsecond precision)
   - Track Rust ↔ WASM boundary latency
   - Identify bottlenecks (expected: none, should be <100µs)

6. **Offline-First Client**
   - Pre-cache simplified graph in IndexedDB
   - Allow basic routing without network
   - Sync full graph when online

---

## **Technical Specs**

### **Binary Graph Format**
```typescript
// Node arrays (parallel)
node_lats: Float64Array    // [60.391, 60.392, ...]
node_lngs: Float64Array    // [5.321, 5.322, ...]

// Edge arrays (parallel)
edge_from: Uint32Array     // [0, 0, 1, 2, ...]
edge_to: Uint32Array       // [1, 2, 3, 4, ...]
edge_weight: Float32Array  // [120.5, 180.2, ...]  (seconds)
edge_speed: Float32Array   // [50, 60, 40, ...]    (km/h)

// Total: 80MB → ~60MB binary (25% smaller)
```

### **Contraction Hierarchy**
```
Precomputation:
  1. Order nodes by importance (degree, betweenness)
  2. Contract lowest-importance node: add shortcuts
  3. Repeat until all nodes contracted
  Time: ~5 min for Bergen

Query (Bidirectional Dijkstra):
  1. Expand from source until level > target level
  2. Expand from target until level > source level
  3. Meet in middle, return shortest path
  Speedup: 100-1000x vs A* (50ms → 1-5ms)
```

### **Privacy Stack**
```
Client Request:
  POST /api/route
  {from, to, departureTime}
  ↓
Backend:
  1. Hash IP (IPv4: zero octet, IPv6: /48 subnet)
  2. Generate random offset coords
  3. Send fake request to /api/route (decoy)
  4. Send real request with actual coords
  ↓
Router:
  1. Receive both, process both
  2. Map-match GPS to graph edges (Viterbi)
  3. Discard original coords post-calculation
  4. Return only polyline + metadata
  ↓
Storage:
  1. `/api/route/learn` strips user IDs
  2. Aggregate into anonymous time bins
  3. Store only: {hour, dayOfWeek, speedMultiplier}
  ↓
K-Anonymity:
  1. Group concurrent requests by H3 hex (k ≥ 10)
  2. Return routes only when k satisfied
  3. If k < 10, cache + batch with future requests

Result: User cannot be isolated or deanonymized
```

---

## **Success Criteria**

| Metric | Phase 1 | Phase 2 Goal | Measurement |
|--------|---------|-------------|-------------|
| Route calc | 50ms | <5ms | `curl -X POST /api/route \| jq .duration_ms` |
| Graph load | 1000ms | <100ms | Rust WASM precomputation |
| Concurrent users | 50-100 | 500+ | Load test with k6 |
| Memory (runtime) | 150MB | <500MB | `process.memoryUsage().heapUsed` |
| Alternative routes | 1 | 5-10 | Return from Pareto frontier |
| Privacy k-anonymity | N/A | k ≥ 10 | Verify in anonymity bins |
| Bergen features | Partial | Full | Tolls + cameras + bikes |

---

## **CI/CD Integration**

### **GitHub Actions Workflow**
```yaml
on push to main:
  1. Build Rust → WASM
  2. Run proptest (1000+ generated graphs)
  3. Benchmark CH vs A* (regression test)
  4. Build Node.js + TypeScript check
  5. Deploy to Render (if all pass)
  6. Canary: 10% traffic to Rust (week 1)
  7. Ramp to 100% (week 2)
```

### **Rollback Strategy**
```
If WASM crashes:
  - Circuit breaker catches error
  - Fall back to Node A*
  - Alert ops
  - Revert GitHub Actions
  
Manual rollback:
  git push --force origin v1.0:main
  Render auto-redeploys old code
```

---

## **Dependencies (To Install)**

```bash
# Rust
cargo install wasm-pack

# Node.js (server)
npm install --save-dev @types/node

# For Phase 3 features
npm install redis
npm install h3-js
npm install @opentelemetry/api
npm install opossum  # circuit breaker
```

---

## **Handoff Checklist**

- [ ] Phase 1 routing live and tested
- [ ] Rust skeleton compiles (`cargo build --target wasm32-unknown-unknown`)
- [ ] GitHub Actions workflow passes
- [ ] Binary graph format designed + tested
- [ ] CH algorithm outlined (algorithm, not implementation)
- [ ] Multi-criteria weights defined
- [ ] Privacy k-anonymity architecture reviewed
- [ ] Bergen toll ring coordinates loaded (NVDB)
- [ ] Redis capacity planned
- [ ] Next phase owner briefed

---

**Ready to build. Start Week 1 Day 1. Questions? See CLAUDE.md or Phase 2 architecture docs.**
