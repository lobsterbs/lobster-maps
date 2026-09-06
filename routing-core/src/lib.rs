//! LobsterMaps Routing Engine (Rust/WASM)
//! High-performance routing using Contraction Hierarchies

use wasm_bindgen::prelude::*;

pub mod graph;
pub mod ch;

#[wasm_bindgen]
pub struct Router {
    // Placeholder structure for Phase 2
}

#[wasm_bindgen]
impl Router {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Router {
        Router {}
    }
    
    pub fn route(
        &self,
        from_lat: f64,
        from_lng: f64,
        to_lat: f64,
        to_lng: f64,
    ) -> Result<String, JsValue> {
        Ok(format!(
            "Route from ({}, {}) to ({}, {})",
            from_lat, from_lng, to_lat, to_lng
        ))
    }
}
