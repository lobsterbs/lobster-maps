# Phase 2 — Week 1: Foundation (Detailed Day-by-Day)

**Goal:** Rust build pipeline working, CH skeleton compiling, binary graph format designed + tested.

---

## Day 1-2: Rust/WASM Build Pipeline & Development Environment

### Day 1: Setup & First Compile

**Morning (2-3 hours):**

1. **Install Rust toolchain**
   ```bash
   rustup update
   rustup target add wasm32-unknown-unknown
   cargo install wasm-pack
   ```
   Verify: `wasm-pack --version`, `rustup target list | grep wasm32`

2. **Add Rust dependencies to Cargo.toml**
   ```toml
   [dependencies]
   wasm-bindgen = "0.2.70"
   serde = { version = "1.0", features = ["derive"] }
   serde_json = "1.0"
   js-sys = "0.3"
   
   [dev-dependencies]
   proptest = "1.4"
   criterion = "0.5"
   ```

3. **Implement stub exports in src/lib.rs**
   - `pub fn add(a: i32, b: i32) -> i32` (sanity check)
   - `#[wasm_bindgen] pub struct Graph`
   - `#[wasm_bindgen] pub struct Router`
   - `#[wasm_bindgen] impl Router { pub fn new() -> Router }`

4. **Build WASM module**
   ```bash
   cd routing-core
   wasm-pack build --target web
   ```
   **Expected output:** `pkg/` directory with `.wasm` binary + JS bindings

5. **Verify build artifact**
   ```bash
   ls -lh routing-core/pkg/
   # Should show: lobster_routing.wasm (~500KB)
   ```

**Afternoon (2-3 hours):**

6. **Set up Node.js WASM loader**
   - Create `server/src/routing/wasm-loader.ts`
   - Load `.wasm` binary at runtime
   - Export `Router` class for use in `/api/route`

7. **Stub integration test**
   ```typescript
   import { Router } from '../../../routing-core/pkg/lobster_routing.js';
   
   test('Router instantiates', () => {
     const router = new Router();
     expect(router).toBeDefined();
   });
   ```

8. **Commit**
   ```bash
   git add routing-core/Cargo.toml routing-core/src/lib.rs server/src/routing/wasm-loader.ts
   git commit -m "feat: Rust/WASM build pipeline working, first compile"
   ```

**Success Criteria:**
- [ ] `cargo build --target wasm32-unknown-unknown` completes without errors
- [ ] `wasm-pack build` produces `.wasm` in `pkg/`
- [ ] Node.js can load and instantiate Router
- [ ] Test passes

---

### Day 2: GitHub Actions CI/CD Integration

**Morning (1-2 hours):**

1. **Update `.github/workflows/deploy.yml` to build Rust**
   ```yaml
   test-rust:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v3
       - uses: actions-rs/toolchain@v1
         with:
           toolchain: stable
           target: wasm32-unknown-unknown
       - run: cargo build --target wasm32-unknown-unknown
       - run: wasm-pack build --target web
       - run: cargo test
   ```

2. **Add Cargo.lock to git**
   ```bash
   cd routing-core
   cargo generate-lockfile
   git add Cargo.lock
   ```

3. **Test locally with act** (GitHub Actions emulator)
   ```bash
   npm install -g act
   act push -j test-rust
   ```

**Afternoon (1-2 hours):**

4. **Wire into main test suite**
   - `test-server` job now depends on `test-rust`
   - If Rust build fails, whole CI fails

5. **Deploy workflow verification**
   - Push dummy commit to feature branch
   - Watch GitHub Actions run
   - Verify all steps pass

**Success Criteria:**
- [ ] GitHub Actions runs on every push
- [ ] Rust test job passes
- [ ] WASM artifact built and available to Node.js test
- [ ] No warnings or errors in logs

---

## Day 3-4: Binary Graph Format & Data Structures

### Day 3: Design Binary Format & Conversion

**Morning (3-4 hours):**

1. **Design flat binary format** (document in code)
   ```
   Graph Binary Format v1:
   
   Header (64 bytes):
   - Magic: "LOBMAP01" (8 bytes)
   - Version: u32 (4 bytes)
   - Node count: u32 (4 bytes)
   - Edge count: u32 (4 bytes)
   - Reserved: 44 bytes
   
   Node Data (per node):
   - latitude: f64 (8 bytes)
   - longitude: f64 (8 bytes)
   Total: node_count * 16 bytes
   
   Edge Data (per edge):
   - from_node: u32 (4 bytes)
   - to_node: u32 (4 bytes)
   - weight: f32 (4 bytes) [seconds]
   - speed: f32 (4 bytes) [km/h]
   Total: edge_count * 16 bytes
   
   Bergen example:
   - 40,000 nodes = 640 KB
   - 120,000 edges = 1.92 MB
   - Total: ~2.6 MB (vs 80 MB JSON)
   ```

2. **Implement JSON → Binary converter in Node.js**
   ```typescript
   // server/src/routing/osm-to-binary.ts
   export function convertOsmToGeometryBuffer(
     osmGraph: OsmGraph
   ): { nodes: Float64Array; edges: Uint32Array; weights: Float32Array; speeds: Float32Array } {
     // Allocate typed arrays
     const nodes_lats = new Float64Array(osmGraph.nodes.length);
     const nodes_lngs = new Float64Array(osmGraph.nodes.length);
     const edges_from = new Uint32Array(osmGraph.edges.length);
     const edges_to = new Uint32Array(osmGraph.edges.length);
     const edges_weights = new Float32Array(osmGraph.edges.length);
     const edges_speeds = new Float32Array(osmGraph.edges.length);
     
     // Copy data
     osmGraph.nodes.forEach((node, i) => {
       nodes_lats[i] = node.lat;
       nodes_lngs[i] = node.lng;
     });
     
     osmGraph.edges.forEach((edge, i) => {
       edges_from[i] = edge.from;
       edges_to[i] = edge.to;
       edges_weights[i] = edge.weight;
       edges_speeds[i] = edge.speed;
     });
     
     return { nodes_lats, nodes_lngs, edges_from, edges_to, edges_weights, edges_speeds };
   }
   ```

3. **Add benchmark comparison**
   ```typescript
   console.time('JSON load');
   const json = require('bergen-graph.json');
   console.timeEnd('JSON load'); // Expected: ~1000ms
   
   console.time('Binary load');
   const binary = loadBinaryGraph('bergen-graph.bin');
   console.timeEnd('Binary load'); // Expected: ~50ms
   
   console.log('Size reduction:', 80 / 2.6, 'x smaller');
   ```

**Afternoon (2-3 hours):**

4. **Implement Rust side: Graph struct in src/graph.rs**
   ```rust
   pub struct Graph {
       pub node_lats: Vec<f64>,
       pub node_lngs: Vec<f64>,
       pub edge_from: Vec<u32>,
       pub edge_to: Vec<u32>,
       pub edge_weight: Vec<f32>,
       pub edge_speed: Vec<f32>,
   }
   
   impl Graph {
       pub fn from_binary(data: &[u8]) -> Result<Self, String> {
           // Parse header
           let magic = &data[0..8];
           if magic != b"LOBMAP01" {
               return Err("Invalid magic bytes".to_string());
           }
           
           // ... parse node/edge counts, copy into typed arrays
           Ok(Graph { ... })
       }
       
       pub fn node_count(&self) -> usize { self.node_lats.len() }
       pub fn edge_count(&self) -> usize { self.edge_from.len() }
       
       pub fn get_node(&self, idx: u32) -> (f64, f64) {
           (self.node_lats[idx as usize], self.node_lngs[idx as usize])
       }
   }
   ```

5. **Add test for correctness**
   ```rust
   #[test]
   fn test_graph_from_binary() {
       // Create test binary data
       let data = create_test_binary_graph(10, 20); // 10 nodes, 20 edges
       
       let graph = Graph::from_binary(&data).unwrap();
       assert_eq!(graph.node_count(), 10);
       assert_eq!(graph.edge_count(), 20);
   }
   ```

**Success Criteria:**
- [ ] Binary format designed and documented
- [ ] JSON → Binary converter implemented
- [ ] Binary load time <100ms
- [ ] Size reduction 20x+
- [ ] Rust Graph struct parses binary correctly

---

### Day 4: WASM Memory Model & Loading

**Morning (2-3 hours):**

1. **Implement Graph::load_from_js in src/lib.rs**
   ```rust
   #[wasm_bindgen]
   pub struct Router {
       graph: Option<Graph>,
   }
   
   #[wasm_bindgen]
   impl Router {
       #[wasm_bindgen(constructor)]
       pub fn new() -> Router {
           Router { graph: None }
       }
       
       // Load graph from JS typed arrays
       pub fn load_graph(
           &mut self,
           node_lats: Vec<f64>,
           node_lngs: Vec<f64>,
           edge_from: Vec<u32>,
           edge_to: Vec<u32>,
           edge_weight: Vec<f32>,
           edge_speed: Vec<f32>,
       ) -> Result<String, JsValue> {
           self.graph = Some(Graph {
               node_lats,
               node_lngs,
               edge_from,
               edge_to,
               edge_weight,
               edge_speed,
           });
           
           Ok(format!(
               "Loaded {} nodes, {} edges",
               self.graph.as_ref().unwrap().node_count(),
               self.graph.as_ref().unwrap().edge_count()
           ))
       }
   }
   ```

2. **Memory profiling**
   ```typescript
   // server/src/routing/wasm-bench.ts
   const startMem = process.memoryUsage().heapUsed;
   
   const router = new Router();
   router.load_graph(
     new Float64Array(nodes_lats),
     new Float64Array(nodes_lngs),
     new Uint32Array(edges_from),
     new Uint32Array(edges_to),
     new Float32Array(edges_weights),
     new Float32Array(edges_speeds)
   );
   
   const endMem = process.memoryUsage().heapUsed;
   console.log('WASM memory used:', (endMem - startMem) / 1024 / 1024, 'MB');
   // Expected: ~150-200MB for Bergen graph
   ```

**Afternoon (2-3 hours):**

3. **Implement WASM → Node.js marshaling**
   - No copying needed (typed arrays shared reference)
   - Verify JS types map to Rust correctly
   - Test round-trip: load graph, read back same data

4. **Integration test**
   ```typescript
   test('Router loads Bergen graph via WASM', async () => {
     const router = new Router();
     const result = router.load_graph(
       new Float64Array(test_lats),
       new Float64Array(test_lngs),
       new Uint32Array(test_from),
       new Uint32Array(test_to),
       new Float32Array(test_weights),
       new Float32Array(test_speeds)
     );
     
     expect(result).toContain('150 nodes');
     expect(result).toContain('300 edges');
   });
   ```

5. **Commit**
   ```bash
   git add routing-core/src/ server/src/routing/wasm-*.ts
   git commit -m "feat: Binary graph format + WASM memory model

   - Flat binary arrays (Float64Array, Uint32Array)
   - O(1) node/edge access, <100ms load time
   - JSON → Binary converter (20x size reduction)
   - WASM memory profiling (150-200MB for Bergen)
   - Integration tests passing"
   ```

**Success Criteria:**
- [ ] Graph loads into WASM without errors
- [ ] Memory usage <500MB
- [ ] Load time <100ms
- [ ] Typed arrays properly marshaled JS ↔ Rust
- [ ] Test suite passes

---

## Day 5-7: Contraction Hierarchies Skeleton & Tests

### Day 5: CH Algorithm Outline & Node Ordering

**Morning (3-4 hours):**

1. **Implement node importance scoring**
   ```rust
   // routing-core/src/ch.rs
   pub struct ContractionHierarchy {
       pub order: Vec<u32>,           // node contraction order
       pub level: Vec<u32>,           // level of each node
       pub shortcuts: Vec<Shortcut>,  // (from, to, weight, via)
   }
   
   #[derive(Clone)]
   pub struct Shortcut {
       pub from: u32,
       pub to: u32,
       pub weight: f32,
       pub via: u32,  // middle node
   }
   
   impl ContractionHierarchy {
       pub fn compute_importance(
           graph: &Graph,
           node: u32,
           contracted: &[bool],
       ) -> f32 {
           // Heuristic: degree + betweenness proxy
           let mut importance = 0.0;
           
           // In-degree + out-degree
           let mut in_degree = 0;
           let mut out_degree = 0;
           for (i, edge_from) in graph.edge_from.iter().enumerate() {
               if *edge_from == node { out_degree += 1; }
               if graph.edge_to[i] == node { in_degree += 1; }
           }
           importance += (in_degree + out_degree) as f32;
           
           // Prefer contracting low-degree nodes first
           importance
       }
   }
   ```

2. **Implement greedy node ordering**
   ```rust
   pub fn compute_ch_order(graph: &Graph) -> Vec<u32> {
       let n = graph.node_count();
       let mut order = Vec::new();
       let mut contracted = vec![false; n];
       let mut priority_queue = BinaryHeap::new();
       
       // Initialize all nodes
       for node in 0..n as u32 {
           let importance = Self::compute_importance(graph, node, &contracted);
           priority_queue.push((OrderedFloat(importance), node));
       }
       
       // Contract nodes in order of importance
       while let Some((_, node)) = priority_queue.pop() {
           if contracted[node as usize] { continue; }
           order.push(node);
           contracted[node as usize] = true;
       }
       
       order
   }
   ```

3. **Property-based test: verify order is valid**
   ```rust
   #[cfg(test)]
   mod tests {
       use proptest::prelude::*;
       
       proptest! {
           #[test]
           fn prop_ch_order_visits_all_nodes(
               graph in arb_graph(1..100, 0..500)
           ) {
               let order = ContractionHierarchy::compute_ch_order(&graph);
               assert_eq!(order.len(), graph.node_count());
               
               let mut visited = vec![false; graph.node_count()];
               for node in order.iter() {
                   assert!(!visited[*node as usize], "node visited twice");
                   visited[*node as usize] = true;
               }
           }
       }
   }
   ```

**Afternoon (2-3 hours):**

4. **Implement shortcut identification**
   ```rust
   pub fn identify_shortcuts(
       graph: &Graph,
       node: u32,
       order: &[u32],
       level: &[u32],
   ) -> Vec<Shortcut> {
       let mut shortcuts = Vec::new();
       
       // For each pair of neighbors
       let mut in_neighbors = Vec::new();
       let mut out_neighbors = Vec::new();
       
       for (i, edge_from) in graph.edge_from.iter().enumerate() {
           if *edge_from == node { out_neighbors.push(graph.edge_to[i]); }
           if graph.edge_to[i] == node { in_neighbors.push(*edge_from); }
       }
       
       // Find shortcuts: path in_neighbor → node → out_neighbor
       for in_node in in_neighbors {
           for out_node in &out_neighbors {
               // Check if shortcut is needed
               // (only if node is on some shortest path)
               let shortest_via_node = /* Dijkstra */ 0.0;
               let shortest_without_node = /* Dijkstra */ 0.0;
               
               if (shortest_via_node < shortest_without_node) {
                   shortcuts.push(Shortcut {
                       from: in_node,
                       to: *out_node,
                       weight: shortest_via_node,
                       via: node,
                   });
               }
           }
       }
       
       shortcuts
   }
   ```

5. **Commit**
   ```bash
   git commit -m "feat: CH node ordering + shortcut identification

   - Greedy importance-based node ordering
   - Shortcut detection algorithm
   - Property-based tests (proptest)
   - Verified: all nodes visited once, no duplicates"
   ```

---

### Day 6: CH Precomputation & Benchmarking

**Morning (2-3 hours):**

1. **Implement full CH precomputation**
   ```rust
   impl ContractionHierarchy {
       pub fn precompute(graph: &Graph) -> Self {
           let n = graph.node_count();
           let mut order = Vec::new();
           let mut level = vec![0; n];
           let mut shortcuts = Vec::new();
           
           let ch_order = Self::compute_ch_order(graph);
           
           for (priority, node) in ch_order.iter().enumerate() {
               level[*node as usize] = priority as u32;
               
               let node_shortcuts = Self::identify_shortcuts(
                   graph,
                   *node,
                   &ch_order,
                   &level,
               );
               shortcuts.extend(node_shortcuts);
               
               order.push(*node);
           }
           
           ContractionHierarchy { order, level, shortcuts }
       }
   }
   ```

2. **Add progress callbacks for long operations**
   ```rust
   pub fn precompute_with_progress<F>(
       graph: &Graph,
       mut progress: F,
   ) -> Self where F: FnMut(f32) {
       let n = graph.node_count();
       // ... precompute, call progress(i / n) every iteration
   }
   ```

3. **Benchmark: CH precomputation time**
   ```rust
   #[bench]
   fn bench_ch_precompute_small(b: &mut Bencher) {
       let graph = create_test_graph(1000, 3000);
       b.iter(|| ContractionHierarchy::precompute(&graph));
       // Expected: <1 second for 1000 nodes
   }
   
   #[bench]
   fn bench_ch_precompute_medium(b: &mut Bencher) {
       let graph = create_test_graph(10000, 30000);
       b.iter(|| ContractionHierarchy::precompute(&graph));
       // Expected: ~10 seconds for 10k nodes
   }
   ```

**Afternoon (2-3 hours):**

4. **Implement Bergen-scale benchmark**
   ```rust
   #[test]
   #[ignore] // Only run with --ignored
   fn bench_ch_precompute_bergen() {
       let start = Instant::now();
       let graph = load_bergen_graph(); // 40k nodes
       println!("Graph load: {:?}", start.elapsed());
       
       let start = Instant::now();
       let ch = ContractionHierarchy::precompute(&graph);
       println!("CH precompute: {:?}", start.elapsed());
       // Target: <5 minutes
       
       println!("Shortcuts: {}", ch.shortcuts.len());
       println!("Compression ratio: {}", 
           (graph.edge_count() as f32 / ch.shortcuts.len() as f32)
       );
   }
   ```

5. **Profile memory usage**
   ```rust
   println!("Graph size: {}MB", 
       (graph.node_count() * 16 + graph.edge_count() * 16) / 1024 / 1024
   );
   println!("CH shortcuts: {}MB", 
       (ch.shortcuts.len() * 24) / 1024 / 1024
   );
   // Target: Total <500MB
   ```

---

### Day 7: Testing & Documentation

**Morning (2-3 hours):**

1. **Property-based tests for CH correctness**
   ```rust
   proptest! {
       #[test]
       fn prop_ch_preserves_shortest_paths(
           graph in arb_graph(2..50, 5..200)
       ) {
           let ch = ContractionHierarchy::precompute(&graph);
           
           // Verify: for random pairs, CH distance == Dijkstra distance
           for _ in 0..10 {
               let (from, to) = arb_node_pair(&graph);
               let dijkstra_dist = compute_shortest_path(&graph, from, to);
               let ch_dist = compute_ch_path(&graph, &ch, from, to);
               
               assert!((dijkstra_dist - ch_dist).abs() < 0.1,
                   "CH path differs from Dijkstra");
           }
       }
   }
   ```

2. **Unit tests for each component**
   ```bash
   cargo test --lib -- --nocapture
   # Expected: 30+ tests passing
   ```

**Afternoon (2-3 hours):**

3. **Document CH algorithm**
   - Create `routing-core/CH_ALGORITHM.md`
   - Include: why CH, how it works, performance characteristics
   - Add diagrams (ASCII art)

4. **Create GitHub Actions regression test**
   - Run benchmarks on every push to feature branch
   - Fail if precompute time regresses >10%
   - Store results in GitHub Actions artifact

5. **Final commit and status report**
   ```bash
   git add routing-core/src/ch.rs routing-core/CH_ALGORITHM.md
   git commit -m "feat: Contraction Hierarchies fully implemented + tested

   - Precomputation: <5 min for 40k nodes (Bergen scale)
   - Memory: <200MB for CH data
   - Correctness: property-based tests (50+ test cases)
   - Benchmarks: regression testing on CI
   - Documentation: CH_ALGORITHM.md with diagrams
   
   Ready for Week 2 (query algorithm implementation)"
   ```

---

## Week 1 Success Checklist

- [ ] Rust toolchain installed + wasm-pack compiling
- [ ] GitHub Actions builds and tests Rust on every push
- [ ] Binary graph format designed and verified
- [ ] JSON → Binary converter working (20x size reduction)
- [ ] Graph loads into WASM <100ms
- [ ] Memory usage profiled (<500MB)
- [ ] CH node ordering algorithm implemented
- [ ] Shortcut identification algorithm implemented
- [ ] CH precomputation <5 min for Bergen
- [ ] Property-based tests passing (50+)
- [ ] Benchmarks and regression testing configured
- [ ] All code committed and pushed
- [ ] Notion updated with Week 1 progress
- [ ] CLAUDE.md updated with Week 1 learnings

---

## Performance Targets (After Week 1)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Rust compile | <30sec | ? | TBD |
| WASM binary size | <1MB | ? | TBD |
| Graph load time | <100ms | ? | TBD |
| CH precompute | <5 min | ? | TBD |
| Memory (total) | <500MB | ? | TBD |
| Test coverage | >80% | ? | TBD |
| CI/CD time | <5 min | ? | TBD |

---

## Resources

- [Contraction Hierarchies Paper](https://algo2.iti.kit.edu/schultes/route_planning.pdf)
- [WASM Bindgen Book](https://rustwasm.github.io/docs/wasm-bindgen/)
- [Proptest Guide](https://docs.rs/proptest/1.0.0/proptest/)
- [Criterion.rs Benchmarking](https://bheisler.github.io/criterion.rs/book/index.html)

---

**Week 1 Complete → Move to Week 2: CH Query Algorithm**
