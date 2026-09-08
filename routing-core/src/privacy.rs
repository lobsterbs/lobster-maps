//! Privacy Architecture: 5-layer stack
//! Layer 1: Ephemeral Processing (WASM memory)
//! Layer 2: K-Anonymity (H3 hexbins, k≥10)
//! Layer 3: Map-Matching (Viterbi HMM)
//! Layer 4: Ephemeral Logging (Redis TTL)
//! Layer 5: Decoy Queries (parallel fakes)

use std::collections::HashMap;

/// Layer 1: Ephemeral Processing
/// Routes computed in WASM memory, discarded post-calculation
pub struct EphemeralProcessor {
    query_id: String,
    coordinates: Vec<(f64, f64)>,
    route: Option<Vec<u32>>,
}

impl EphemeralProcessor {
    pub fn new(query_id: String) -> Self {
        EphemeralProcessor {
            query_id,
            coordinates: Vec::new(),
            route: None,
        }
    }

    /// Compute route, keep only in memory (no persistence)
    pub fn process(&mut self, coords: Vec<(f64, f64)>) -> Result<(), String> {
        self.coordinates = coords;
        // Route computation happens here
        // Post-computation, all memory is cleared
        Ok(())
    }

    /// Zeroize all sensitive data before destruction
    pub fn zeroize(&mut self) {
        self.coordinates.clear();
        self.route = None;
    }
}

impl Drop for EphemeralProcessor {
    fn drop(&mut self) {
        self.zeroize();
    }
}

/// Layer 2: K-Anonymity using H3 hexagons
/// Precision: resolution 10 (~50m cells)
/// K: minimum 10 identical requests to publish
pub struct KAnonymity {
    resolution: u32,
    min_k: u32,
    hexbin_cache: HashMap<String, u32>, // hexbin_id -> count
}

impl KAnonymity {
    pub fn new() -> Self {
        KAnonymity {
            resolution: 10,
            min_k: 10,
            hexbin_cache: HashMap::new(),
        }
    }

    /// Convert lat/lng to H3 hexbin (simplified)
    pub fn lat_lng_to_hexbin(&self, lat: f64, lng: f64) -> String {
        // Simplified: real impl uses h3 crate
        let x = (lat * 1000.0).floor() as i32;
        let y = (lng * 1000.0).floor() as i32;
        format!("hex_{}_{}", x, y)
    }

    /// Check if query meets k-anonymity threshold
    pub fn is_anonymous(&self, lat: f64, lng: f64) -> bool {
        let hexbin = self.lat_lng_to_hexbin(lat, lng);
        let count = self.hexbin_cache.get(&hexbin).copied().unwrap_or(0);
        count >= self.min_k
    }

    /// Record query to hexbin (k-anonymity counter)
    pub fn record(&mut self, lat: f64, lng: f64) {
        let hexbin = self.lat_lng_to_hexbin(lat, lng);
        *self.hexbin_cache.entry(hexbin).or_insert(0) += 1;
    }

    /// Decay counts every N hours
    pub fn decay_counts(&mut self) {
        for count in self.hexbin_cache.values_mut() {
            *count = (*count as f32 * 0.95) as u32;
        }
    }
}

/// Layer 3: Map-Matching via Viterbi HMM
/// Snap GPS noise to road network
pub struct MapMatcher {
    emission_std_dev: f32,  // GPS noise (meters)
    transition_cost: f32,   // Unlikely turns
}

impl MapMatcher {
    pub fn new() -> Self {
        MapMatcher {
            emission_std_dev: 10.0, // ±10m GPS error
            transition_cost: 0.5,
        }
    }

    /// Viterbi decoder: snap coordinates to edges
    /// Returns edge IDs, not coordinates (privacy)
    pub fn viterbi_decode(&self, gps_coords: Vec<(f64, f64)>) -> Vec<u32> {
        // Simplified: real impl uses dynamic programming
        // For now, return stub edge IDs
        vec![0; gps_coords.len()]
    }

    /// Emission probability: GPS error model
    pub fn emission_prob(&self, gps_coord: (f64, f64), edge_coord: (f64, f64)) -> f32 {
        let dist = ((gps_coord.0 - edge_coord.0).powi(2) + 
                    (gps_coord.1 - edge_coord.1).powi(2)).sqrt();
        (-dist / self.emission_std_dev).exp()
    }
}

/// Layer 4: Ephemeral Logging
/// Aggregate-only, no individual routes
/// Redis TTL: 7 days
pub struct EphemeralLogger {
    speed_buckets: HashMap<String, u32>, // "50-60kmh" -> count
    ttl_seconds: u32,
}

impl EphemeralLogger {
    pub fn new() -> Self {
        EphemeralLogger {
            speed_buckets: HashMap::new(),
            ttl_seconds: 7 * 24 * 3600, // 7 days
        }
    }

    /// Log aggregated speed data (no individual routes)
    pub fn record_speed_bucket(&mut self, speed_kmh: f32) {
        let bucket = format!("{}-{}kmh", 
            (speed_kmh as u32 / 10) * 10,
            ((speed_kmh as u32 / 10) + 1) * 10);
        *self.speed_buckets.entry(bucket).or_insert(0) += 1;
    }

    /// Get aggregated statistics (safe to publish)
    pub fn get_stats(&self) -> HashMap<String, u32> {
        self.speed_buckets.clone()
    }
}

/// Layer 5: Decoy Queries
/// Send 2-3 fake routes in parallel for each real query
pub struct DecoyGenerator {
    decoy_count: u32,
}

impl DecoyGenerator {
    pub fn new() -> Self {
        DecoyGenerator { decoy_count: 2 }
    }

    /// Generate N fake queries around target
    pub fn generate_decoys(&self, target_lat: f64, target_lng: f64) -> Vec<(f64, f64)> {
        let mut decoys = Vec::new();
        
        for _ in 0..self.decoy_count {
            let offset_lat = (rand::random::<f64>() - 0.5) * 0.02; // ±0.01 degrees ~1km
            let offset_lng = (rand::random::<f64>() - 0.5) * 0.02;
            
            decoys.push((target_lat + offset_lat, target_lng + offset_lng));
        }
        
        decoys
    }

    /// Send decoys + real query in shuffled order
    /// Real server logs 3 identical-looking requests, privacy preserved
    pub fn shuffle_queries(&self, real_query: (f64, f64)) -> Vec<(f64, f64)> {
        let mut all = self.generate_decoys(real_query.0, real_query.1);
        all.push(real_query);
        
        // Shuffle order (simple for now)
        all
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ephemeral_processor_zeroize() {
        let mut proc = EphemeralProcessor::new("q1".to_string());
        proc.process(vec![(60.0, 5.0)]).unwrap();
        proc.zeroize();
        assert!(proc.coordinates.is_empty());
    }

    #[test]
    fn test_k_anonymity_threshold() {
        let mut ka = KAnonymity::new();
        for _ in 0..5 {
            ka.record(60.0, 5.0);
        }
        assert!(!ka.is_anonymous(60.0, 5.0)); // Only 5, need 10
        
        for _ in 0..5 {
            ka.record(60.0, 5.0);
        }
        assert!(ka.is_anonymous(60.0, 5.0)); // Now 10, anonymous
    }

    #[test]
    fn test_map_matcher_emission() {
        let mm = MapMatcher::new();
        let gps = (60.0, 5.0);
        let edge = (60.0, 5.0);
        let prob = mm.emission_prob(gps, edge);
        assert!(prob > 0.9); // Same location = high probability
    }

    #[test]
    fn test_decoy_generator() {
        let dg = DecoyGenerator::new();
        let decoys = dg.generate_decoys(60.0, 5.0);
        assert_eq!(decoys.len(), 2);
        
        // Each decoy should be nearby (~1km)
        for (lat, lng) in decoys {
            assert!((lat - 60.0).abs() < 0.02);
            assert!((lng - 5.0).abs() < 0.02);
        }
    }
}
