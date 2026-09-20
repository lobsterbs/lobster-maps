# LobsterMaps Privacy Architecture — Phase 2

**Principle:** Zero-knowledge routing. Routes computed client-side where possible, never stored server-side, user coordinates discarded post-calculation.

---

## Threat Model

### Adversaries We Defend Against
1. **Server compromise:** Attacker gains access to LobsterMaps database
2. **Network eavesdropper:** Attacker intercepts HTTPS traffic
3. **ISP/backbone surveillance:** Traffic metadata captured at scale
4. **Application backdoor:** Malicious update to client code
5. **Cross-site tracking:** Third-party cookies / browser fingerprinting
6. **Temporal deanonymization:** Link routes across time (e.g., home→work daily)

### Threats We Accept (Out of Scope Phase 2)
- **Timing attacks:** Response time reveals route complexity
- **Packet size leakage:** HTTPS headers expose routing domain
- **Location inference:** Popular routes may correlate with real-world locations
- **Client-side malware:** Keylogger, spyware (user's device, not our problem)

---

## Architecture Layers

### Layer 1: Ephemeral Processing (Server-Side)

**Goal:** Routes computed in-memory, never persisted.

```
┌─────────────────────────────────────────────┐
│ POST /api/route                             │
│ { from, to, departureTime, vehicle }        │
└───────────┬─────────────────────────────────┘
            │
            ↓
   ┌────────────────────────────┐
   │ 1. Strip User ID           │
   │    (no cookie, no token)   │
   └────────────┬───────────────┘
                │
                ↓
   ┌──────────────────────────────────────┐
   │ 2. Route in WASM (Rust/WASM binary)  │
   │    - A* / CH algorithm               │
   │    - Coords live only in WASM memory │
   │    - Discarded after calc            │
   └────────────┬─────────────────────────┘
                │
                ↓
   ┌──────────────────────────────────────┐
   │ 3. Return Polyline + Metadata Only   │
   │    NO: user ID, device ID, IP        │
   │    YES: encoded path, ETA, distance  │
   └──────────────────────────────────────┘
```

**Implementation:**
```typescript
// server/src/routes/routing.ts
router.post('/api/route', async (req, res) => {
  // ❌ NO: req.user, req.ip, req.sessionId
  const { from, to, departureTime, vehicle } = req.body;
  
  // Route in WASM (Rust memory, no JS access)
  const route = await router.route(from, to, departureTime);
  
  // Return ONLY the result (polyline, ETA, distance)
  res.json({
    polyline: route.polyline,  // ✓ Encoded, no individual coords
    distance_m: route.distance,
    duration_s: route.duration,
    // NO: from_lat, from_lng, to_lat, to_lng
    // NO: user_id, session_id, device_id
    // NO: timestamp
  });
});
```

**Verification:**
- [ ] No route logs in database
- [ ] No HTTP logs include user ID
- [ ] WASM memory cleared after route calc
- [ ] Response JSON has no PII

---

### Layer 2: K-Anonymity (Spatial Binning)

**Goal:** Individual routes indistinguishable within groups (k ≥ 10).

**Method:** Uber H3 hexagonal spatial indexing.

```
H3 Hexagonal Grid (Resolution 10, ~50m cells):

Before anonymization:
  User A: from=59.91°, to=60.40°  Route #1
  User B: from=59.91°, to=60.41°  Route #2
  User C: from=59.91°, to=60.40°  Route #3  (same as A)
  
H3 Bins (cell coordinates):
  - User A → hex_89a82d0b7ffffff (cell 1)
  - User B → hex_89a82d0b7ffffff (cell 1)  ← Same cell, k=2
  - User C → hex_89a82d0b7ffffff (cell 1)
  
Result: All 3 routes binned together, k=3 < 10 (not anonymous yet)

After batching (5 sec delay):
  - User D arrives → cell 1, k=4
  - User E arrives → cell 1, k=5
  - ... wait for 10 routes in same bin
  
Once k ≥ 10: Release all routes together
```

**Implementation:**

```typescript
// server/src/privacy/k-anonymity.ts
import h3 from 'h3-js';

export class KAnonymityBatcher {
  private bins: Map<string, PendingRoute[]> = new Map();
  private batch_timeout = 5000; // 5 sec max wait
  
  async process(route: RouteResult): Promise<RouteResult | null> {
    // Map start + end coords to H3 cell
    const cell_start = h3.latLngToCell(
      route.from.lat, route.from.lng, 10
    );
    const cell_end = h3.latLngToCell(
      route.to.lat, route.to.lng, 10
    );
    const bin_key = `${cell_start}→${cell_end}`;
    
    // Batch route in bin
    if (!this.bins.has(bin_key)) {
      this.bins.set(bin_key, []);
    }
    const bin = this.bins.get(bin_key)!;
    bin.push({
      route,
      timestamp: Date.now(),
    });
    
    // Return if k ≥ 10 OR timeout
    if (bin.length >= 10) {
      const routes = bin.splice(0, 10);
      return this.returnRoutesBatch(routes);
    }
    
    if (bin.length === 1) {
      // First in batch, schedule timeout
      setTimeout(() => {
        if (bin.length > 0) {
          const routes = bin.splice(0);
          this.returnRoutesBatch(routes);
        }
      }, this.batch_timeout);
    }
    
    return null; // Still batching, don't return yet
  }
  
  private returnRoutesBatch(routes: PendingRoute[]): RouteResult {
    // All routes in batch are indistinguishable
    // Return the first one (or random one)
    return routes[0].route;
  }
}
```

**Verification:**
- [ ] H3 resolution chosen so k ≥ 10 achievable
- [ ] No response sent until k satisfied
- [ ] Timeout prevents indefinite waiting
- [ ] Bins cleared hourly (no persistent correlation)

---

### Layer 3: Map-Matching (GPS Noise Reduction)

**Goal:** Snap noisy GPS points to actual road network (prevent reverse-engineering true routes).

**Algorithm:** Viterbi (Hidden Markov Model).

```
Real location (user walking):        Reported to us:
60.391352°N                          60.391352°N ± 5m noise
5.323456°E                           5.323456°E ± 5m noise
                    ↓                         ↓
          Map-matching (Viterbi):
          Snap to nearest road edge:
          ┌────────────────────────┐
          │ Road segment 1         │
          │ ├─ Start: (60.391, 5.323)
          │ ├─ End: (60.392, 5.324)
          │ └─ Probability: 0.95
          │ Road segment 2 (parallel)
          │ ├─ Start: (60.391, 5.322)
          │ ├─ End: (60.392, 5.323)
          │ └─ Probability: 0.05 (further away)
          └────────────────────────┘
          Result: "On Bryggen street" (not precise coords)
```

**Why it helps:**
- Attacker sees noisy points, but can't reverse-engineer actual route
- Multiple roads could plausibly match the noise
- Returns only matched edge ID, not lat/lng

**Implementation:**

```rust
// routing-core/src/privacy/map_matching.rs
pub struct MapMatcher {
    graph: Graph,
    emission_sigma: f32,  // GPS noise stddev (meters)
    transition_cost: f32,  // Cost to jump to different road
}

impl MapMatcher {
    pub fn match_trajectory(
        &self,
        gps_points: &[(f64, f64)],  // lat, lng with noise
    ) -> Vec<u32> {
        // Viterbi decoder
        let n_points = gps_points.len();
        let n_edges = self.graph.edge_count();
        
        // Emission probabilities: each point to each edge
        let mut emissions = vec![vec![0.0; n_edges]; n_points];
        for (i, (lat, lng)) in gps_points.iter().enumerate() {
            for edge_id in 0..n_edges {
                let edge_dist = self.distance_to_edge(*lat, *lng, edge_id);
                // Gaussian: P(observation | on this edge)
                emissions[i][edge_id] = 
                    (-edge_dist.powi(2) / (2.0 * self.emission_sigma.powi(2))).exp();
            }
        }
        
        // Viterbi: find most likely sequence of edges
        let mut path = vec![0; n_points];
        let mut max_prob = vec![vec![0.0; n_edges]; n_points];
        
        // Initialize first point
        for edge in 0..n_edges {
            max_prob[0][edge] = emissions[0][edge];
        }
        
        // Forward pass
        for i in 1..n_points {
            for curr_edge in 0..n_edges {
                let emission = emissions[i][curr_edge];
                // Best previous edge
                let best_prev = (0..n_edges)
                    .max_by(|&prev| {
                        let transition = self.edge_transition_prob(prev, curr_edge);
                        (max_prob[i-1][prev] * transition * emission).partial_cmp(&0.0).unwrap()
                    })
                    .unwrap();
                
                max_prob[i][curr_edge] = 
                    max_prob[i-1][best_prev] *
                    self.edge_transition_prob(best_prev, curr_edge) *
                    emission;
            }
        }
        
        // Backtrack to find path
        path[n_points - 1] = 
            (0..n_edges).max_by_key(|&e| (max_prob[n_points-1][e] * 1000.0) as i32).unwrap() as u32;
        
        for i in (1..n_points).rev() {
            let curr = path[i] as usize;
            path[i-1] = (0..n_edges)
                .max_by_key(|&prev| {
                    (max_prob[i-1][prev] * 
                     self.edge_transition_prob(prev, curr) * 1000.0) as i32
                })
                .unwrap() as u32;
        }
        
        path
    }
    
    fn distance_to_edge(&self, lat: f64, lng: f64, edge_id: usize) -> f32 {
        // Distance from point to nearest point on edge (great-circle distance)
        // ... (haversine implementation)
        0.0
    }
    
    fn edge_transition_prob(&self, from: usize, to: usize) -> f32 {
        // Probability of going from one edge to another
        // High if edges are connected, low otherwise
        if self.are_connected(from, to) { 0.9 } else { 0.1 }
    }
}
```

**Verification:**
- [ ] Viterbi decoder produces valid edge sequences
- [ ] Only edge IDs returned, not coordinates
- [ ] GPS noise properly modeled (sigma ≈ 5-10 meters)

---

### Layer 4: Ephemeral Logging (Traffic Learning)

**Goal:** Learn traffic patterns WITHOUT storing individual routes.

```
User routes (ephemeral, discarded):
  Route A: from → to, speed=60 km/h, hour=9, Monday
  Route B: from → to, speed=40 km/h, hour=9, Monday  (congestion)
  Route C: from → to, speed=55 km/h, hour=9, Monday
            ↓
   Aggregation (no PII):
   
   Speed bucket:
   { hour: 9, day: Monday, edge_id: 123, speed_percentile_50: 50 }
   (NOT: which user, how many users, specific timestamps)
            ↓
   Stored in DB:
   Table: traffic_speeds_anonymous
   ├─ hour (0-23)
   ├─ day_of_week (0-6)
   ├─ edge_id
   ├─ speed_percentile_50  (median)
   ├─ speed_percentile_90  (congestion signal)
   └─ count (how many observations, aggregated)
```

**Implementation:**

```typescript
// server/src/privacy/traffic-aggregation.ts
export class TrafficAggregator {
  async recordObservation(
    edge_id: number,
    speed: number,
    timestamp: Date
  ) {
    // ❌ NO: userId, deviceId, sessionId
    
    const hour = timestamp.getHours();
    const day = timestamp.getDay();
    
    // Bucket into anonymous aggregate
    const key = `edge_${edge_id}:hour_${hour}:day_${day}`;
    
    // Store in Redis (ephemeral, 7-day TTL)
    await redis.lpush(`traffic_speeds:${key}`, speed);
    await redis.expire(`traffic_speeds:${key}`, 7 * 24 * 3600);
  }
  
  async computeAggregates() {
    // Hourly job: compute percentiles from buckets
    const pattern = 'traffic_speeds:*';
    const keys = await redis.keys(pattern);
    
    for (const key of keys) {
      const speeds = await redis.lrange(key, 0, -1);
      if (speeds.length < 5) continue; // Skip small samples
      
      const sorted = speeds.map(Number).sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p90 = sorted[Math.floor(sorted.length * 0.9)];
      
      const [, edge_id, hour, day] = key.match(/edge_(\d+):hour_(\d+):day_(\d+)/) || [];
      
      // Write aggregated stats (no individual speeds)
      await db.query(
        `INSERT INTO traffic_stats_anonymous (edge_id, hour, day, p50, p90, count)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [edge_id, hour, day, p50, p90, sorted.length]
      );
    }
  }
}
```

**Verification:**
- [ ] No individual route data in database
- [ ] Aggregates only computed from 5+ observations
- [ ] Redis keys expire (no permanent storage)
- [ ] Logs contain only aggregated statistics

---

### Layer 5: Decoy Queries (Traffic Noise)

**Goal:** Indistinguishable whether user is querying a real route or random decoy.

```
┌──────────────────────────────────────────────┐
│ User requests: Route from Home → Work        │
│                  (real query)                 │
└──────────────────┬───────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ↓                   ↓
   Real Request         Decoy Requests
   Home → Work          Bergen → Stavanger (random)
   Bergen → Fana        Fana → Landås (random)
                              (2-3 fake routes)
         │                   │
         └─────────┬─────────┘
                   │
    ┌──────────────┴──────────────┐
    │ All 3-4 requests sent      │
    │ in parallel, random order   │
    └──────────────┬──────────────┘
                   │
         Server sees 4 requests,
         can't distinguish which is real
         (all get k-anonymity batched)
         │
         ↓
    Return all 4 routes
         │
         ↓
    Client filters: use Home→Work, discard others
```

**Implementation:**

```typescript
// client/src/lib/privacy-queries.ts
export async function queryWithDecoys(
  from: [number, number],
  to: [number, number]
): Promise<Route> {
  // Generate 2 random decoy routes in Bergen area
  const decoys = [
    {
      from: randomPointInBergen(),
      to: randomPointInBergen(),
    },
    {
      from: randomPointInBergen(),
      to: randomPointInBergen(),
    },
  ];
  
  // Real + decoys
  const queries = [
    { from, to },  // Real
    ...decoys,     // Decoys
  ];
  
  // Shuffle to hide which is real
  queries.sort(() => Math.random() - 0.5);
  
  // Send all in parallel
  const results = await Promise.all(
    queries.map(q => fetch('/api/route', {
      method: 'POST',
      body: JSON.stringify(q),
    }).then(r => r.json()))
  );
  
  // Server can't tell which route is real
  // Client returns only the real one
  return results.find(r => 
    r.polyline_start_lat === from[0] &&
    r.polyline_start_lng === from[1]
  )!;
}
```

**Verification:**
- [ ] Decoy locations randomized
- [ ] Requests sent in random order
- [ ] All requests complete before returning
- [ ] Server logs show equal distribution (real ≈ decoys)

---

## Privacy Checklist (Phase 2)

### Server-Side
- [ ] No user ID stored with routes
- [ ] No IP address logged
- [ ] No session IDs in route table
- [ ] Routes cleared from memory post-calc
- [ ] Aggregation functions tested
- [ ] Redis keys expire (TTL set)
- [ ] Database schema has no user_id foreign key

### Client-Side
- [ ] Coordinates stripped from response
- [ ] Decoy queries generated
- [ ] IndexedDB entries encrypted (AES)
- [ ] No localStorage usage (disabled in privacy mode)
- [ ] No third-party cookies

### Architecture
- [ ] H3 resolution chosen for k ≥ 10
- [ ] Map-matching Viterbi tested
- [ ] K-anonymity batcher handles timeouts
- [ ] Ephemeral logging aggregates only
- [ ] Code reviewed for accidental PII leakage

---

## Privacy Threat Analysis (Post-Implementation)

| Threat | Phase 1 | Phase 2 | Residual Risk |
|--------|---------|---------|---------------|
| Server DB breach | ❌ Route stored | ✓ Ephemeral | Very low |
| Network eavesdrop | ⚠️ HTTPS only | ✓ Decoys | Low |
| Temporal deanon | ❌ No defense | ✓ K-anonymity | Low (5sec batches) |
| ISP surveillance | ❌ Visible routing domain | ✓ API generic | Medium |
| Client tracking | ❌ No defense | ✓ Encrypted IndexedDB | Low |
| GPS reverse-eng | N/A | ✓ Map-matching | Very low |

---

**Status: Privacy architecture designed. Ready for Week 3 implementation.**
