use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

pub mod graph;
pub mod ch;
pub mod utils;
pub mod bidirectional_ch;
pub mod multicriteria;

use crate::graph::Graph;
use crate::bidirectional_ch::BidirectionalCH;
use crate::multicriteria::MultiCriteriaRouter;

#[wasm_bindgen]
pub struct Router {
    graph: Option<Graph>,
    bidirectional_ch: Option<BidirectionalCH>,
    multicriteria: Option<MultiCriteriaRouter>,
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize)]
pub struct RouteResult {
    pub distance_m: f32,
    pub duration_s: f32,
    pub node_sequence: Vec<u32>,
    pub polyline: String,
}

#[wasm_bindgen]
impl Router {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Router {
        Router {
            graph: None,
            bidirectional_ch: None,
            multicriteria: None,
        }
    }

    /// Load graph from binary format
    #[wasm_bindgen]
    pub fn load_graph_binary(&mut self, buffer: &[u8]) -> Result<String, JsValue> {
        match Graph::from_binary(buffer) {
            Ok(graph) => {
                let node_count = graph.node_count();
                let edge_count = graph.edge_count();
                self.graph = Some(graph.clone());
                self.bidirectional_ch = Some(BidirectionalCH::new());
                self.multicriteria = Some(MultiCriteriaRouter::new());
                Ok(format!("✓ Loaded {} nodes, {} edges", node_count, edge_count))
            }
            Err(e) => Err(JsValue::from_str(&format!("Failed to load graph: {}", e))),
        }
    }

    /// Load graph from JSON (debug/testing)
    #[wasm_bindgen]
    pub fn load_graph_json(&mut self, json_str: &str) -> Result<String, JsValue> {
        match Graph::from_json(json_str) {
            Ok(graph) => {
                let node_count = graph.node_count();
                let edge_count = graph.edge_count();
                self.graph = Some(graph.clone());
                self.bidirectional_ch = Some(BidirectionalCH::new());
                self.multicriteria = Some(MultiCriteriaRouter::new());
                Ok(format!("✓ Loaded {} nodes, {} edges from JSON", node_count, edge_count))
            }
            Err(e) => Err(JsValue::from_str(&format!("Failed to parse graph JSON: {}", e))),
        }
    }

    /// Query using bidirectional Dijkstra (fast, optimal)
    #[wasm_bindgen]
    pub fn query_bidirectional(&self, from: u32, to: u32) -> Result<String, JsValue> {
        match &self.graph {
            Some(graph) => {
                match crate::bidirectional_ch::query_bidirectional(graph, from, to) {
                    Ok(route) => Ok(serde_json::to_string(&route)
                        .map_err(|e| JsValue::from_str(&e.to_string()))?),
                    Err(e) => Err(JsValue::from_str(&format!("Bidirectional query failed: {}", e))),
                }
            }
            None => Err(JsValue::from_str("Graph not loaded")),
        }
    }

    /// Query route using A* (fallback)
    #[wasm_bindgen]
    pub fn query_astar(&self, from: u32, to: u32) -> Result<String, JsValue> {
        match &self.graph {
            Some(graph) => {
                match crate::utils::astar_route(graph, from, to) {
                    Ok(route) => Ok(serde_json::to_string(&route)
                        .map_err(|e| JsValue::from_str(&e.to_string()))?),
                    Err(e) => Err(JsValue::from_str(&format!("A* query failed: {}", e))),
                }
            }
            None => Err(JsValue::from_str("Graph not loaded")),
        }
    }

    /// Get graph statistics
    #[wasm_bindgen]
    pub fn graph_stats(&self) -> Result<String, JsValue> {
        match &self.graph {
            Some(graph) => {
                let stats = serde_json::json!({
                    "nodes": graph.node_count(),
                    "edges": graph.edge_count(),
                    "memory_bytes": graph.memory_usage(),
                });
                Ok(serde_json::to_string(&stats)
                    .map_err(|e| JsValue::from_str(&e.to_string()))?)
            }
            None => Err(JsValue::from_str("Graph not loaded")),
        }
    }

    /// Get router version
    #[wasm_bindgen]
    pub fn version() -> String {
        "1.0.0-phase2".to_string()
    }

    /// Get router status
    #[wasm_bindgen]
    pub fn status(&self) -> String {
        match (&self.graph, &self.bidirectional_ch) {
            (Some(g), Some(_)) => format!("Ready ({}N {}E)", g.node_count(), g.edge_count()),
            (Some(g), None) => format!("Graph loaded but CH not ready ({}N {}E)", g.node_count(), g.edge_count()),
            (None, _) => "No graph loaded".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_router_creation() {
        let router = Router::new();
        assert_eq!(Router::version(), "1.0.0-phase2");
    }

    #[test]
    fn test_empty_graph_stats() {
        let router = Router::new();
        let result = router.graph_stats();
        assert!(result.is_err());
    }

    #[test]
    fn test_status() {
        let router = Router::new();
        assert_eq!(router.status(), "No graph loaded");
    }
}

// WASM Modules
pub mod rate_limiter;
pub mod search_scorer;

// Weather Cache WASM
pub mod weather_cache;
