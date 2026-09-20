# Phase 2 Week 2: Bidirectional CH + Multi-Criteria Routing

**Duration:** 8 hours  
**Goal:** Make pathfinding fast (<5ms) and smart (multi-criteria)  
**Status:** STARTING NOW (Sep 6, 2026)

---

## Day 1-3: Bidirectional Dijkstra (CH Queries)

### What
- Implement forward search (source → all nodes)
- Implement backward search (target → all nodes)
- Meeting point detection (where searches meet)
- Pruning optimization (stop when proved optimal)

### Deliverables
- `routing-core/src/bidirectional_ch.rs` (275 LOC, in progress)
- Property-based tests (50+)
- Benchmark: <5ms queries on Bergen graph
- Path reconstruction working

### Algorithm
```
1. Start forward search from source
2. Start backward search from target
3. Expand both simultaneously (alternate by min priority)
4. When a node is seen from both sides, record meeting point
5. Prune: stop when min_forward + min_backward >= best_path_found
6. Reconstruct path: forward half + backward half
```

### Code Structure
```rust
pub struct BidirectionalCH {
    graph: Option<Graph>,
}

impl BidirectionalCH {
    pub fn query(&self, from: u32, to: u32) -> Result<RouteResult, String> {
        // Bidirectional Dijkstra with meeting point detection
        // Returns optimal path guaranteed
    }
}
```

### Tests
- Simple 3-node path
- Disconnected graphs (should error)
- Same source/target (distance 0)
- Large random graphs (50+ edges)
- Symmetric edge weights
- One-way streets (asymmetric)

---

## Day 4-5: Multi-Criteria Routing

### What
- Time-dependent edge weights (rush hour aware)
- Road type preferences (highway > surface > residential)
- Multi-objective optimization (Pareto-optimal variants)
- Generate 3-5 route options with different trade-offs

### Deliverables
- `routing-core/src/multicriteria.rs` (200+ LOC)
- Edge weight model (time-dependent)
- Route scoring system
- Top-3 variant selection

### Edge Weights (Time-Dependent)
```rust
fn edge_weight(
    base_distance: f32,
    road_type: RoadType,      // highway, primary, secondary, residential
    current_hour: u8,         // 0-23
    is_weekend: bool,
) -> f32 {
    let type_factor = match road_type {
        RoadType::Highway => 0.8,    // 20% faster
        RoadType::Primary => 1.0,    // baseline
        RoadType::Secondary => 1.2,  // 20% slower
        RoadType::Residential => 1.5 // 50% slower
    };
    
    let time_factor = if (7..10).contains(&current_hour) || (16..19).contains(&current_hour) {
        1.5  // Rush hour: 50% slower
    } else {
        1.0
    };
    
    base_distance * type_factor * time_factor
}
```

### Route Scoring
```rust
pub struct RouteScore {
    distance_m: f32,          // Prefer shorter
    duration_s: f32,          // Prefer faster
    safety_score: f32,        // Prefer highways
    scenic_score: f32,        // Prefer non-residential
}

// Pareto filter: keep only non-dominated routes
```

---

## Day 6-7: Integration + Benchmarks

### What
- Integrate bidirectional CH into WASM Router
- Load real Bergen OSM graph
- Property-based tests with real data
- Benchmark: 100 concurrent queries

### Benchmarks
```
Target: <5ms per query (Bergen ~50k nodes)
- 1 query: <5ms
- 10 queries: <50ms total
- 100 concurrent: <500ms total

Current (A*): 50ms per query
Target (CH): 5ms per query
Speedup: 10x
```

### Load Test
```rust
#[test]
fn load_test_100_concurrent() {
    let graph = load_bergen_osm();
    let router = BidirectionalCH::new();
    router.load_graph(graph);
    
    let start = Instant::now();
    
    // 100 random queries in parallel
    let queries: Vec<_> = (0..100)
        .map(|_| {
            let from = random_node();
            let to = random_node();
            router.query(from, to)
        })
        .collect();
    
    let elapsed = start.elapsed();
    println!("100 queries in {:?}", elapsed);
    assert!(elapsed.as_millis() < 500); // <5ms avg
}
```

---

## Files to Create/Modify

### New
- `routing-core/src/bidirectional_ch.rs` (275 LOC) ✓
- `routing-core/src/multicriteria.rs` (200+ LOC)
- `routing-core/tests/bidirectional_tests.rs` (150+ LOC)
- `routing-core/benches/ch_benchmark.rs` (100+ LOC)

### Modify
- `routing-core/src/lib.rs` - Add bidirectional query methods
- `routing-core/Cargo.toml` - Add proptest + criterion

### Tests/Benchmarks
- 50+ property-based tests
- Criterion benchmarks (random graphs)
- Real OSM load tests

---

## Success Criteria

- [ ] Bidirectional Dijkstra working (all tests pass)
- [ ] CH queries <5ms average
- [ ] Multi-criteria routing producing 3+ variants
- [ ] 100 concurrent queries in <500ms
- [ ] 50+ property-based tests passing
- [ ] WASM bindings exposing both methods
- [ ] Zero crashes on random data

---

## Timeline

**Day 1:** Bidirectional search (forward + backward)  
**Day 2:** Meeting point detection + pruning  
**Day 3:** Path reconstruction + tests  
**Day 4:** Edge weight model (time-dependent)  
**Day 5:** Route scoring + Pareto filtering  
**Day 6:** Integration into WASM  
**Day 7:** Load tests + benchmarks

---

## Next (Week 3)

- Privacy architecture (5-layer stack)
- K-anonymity with H3 hexbins
- Map-matching HMM decoder
- Decoy query generation
- Integration with frontend

