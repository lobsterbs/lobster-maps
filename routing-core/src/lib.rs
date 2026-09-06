use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub mod graph;
pub mod ch;
pub mod utils;

use crate::graph::{Graph, Edge, Node};
use crate::ch::ContractionHierarchy;

#[wasm_bindgen]
pub struct Router {
    graph: Option<Graph>,
    ch: Option<ContractionHierarchy>,
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
#[derive(Clone, Serialize, Deserialize)]
pub struct RouteRequest {
    pub from_node: u32,
    pub to_node: u32,
    pub prefer_fast: bool,
}

#[wasm_bindgen]
impl Router {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Router {
        Router {
            graph: None,
            ch: None,
        }
    }

    /// Load graph from binary format
    #[wasm_bindgen]
    pub fn load_graph_binary(&mut self, buffer: &[u8]) -> Result<String, JsValue> {
        match Graph::from_binary(buffer) {
            Ok(graph) => {
                let node_count = graph.node_count();
                let edge_count = graph.edge_count();
                self.graph = Some(graph);
                Ok(format!("✓ Loaded {} nodes, {} edges", node_count, edge_count))
            }
            Err(e) => Err(JsValue::from_str(&format!("Failed to load graph: {}", e))),
        }
    }

    /// Load graph from JSON (debug/testing)
    #[wasm_bindgen]
    pub fn load_graph_json(&mut self, json_str: &str) -> Result<String, JsValue> {
        match serde_json::from_str::<serde_json::Value>(json_str) {
            Ok(_) => {
                // Parse JSON and build graph
                match Graph::from_json(json_str) {
                    Ok(graph) => {
                        let node_count = graph.node_count();
                        let edge_count = graph.edge_count();
                        self.graph = Some(graph);
                        Ok(format!("✓ Loaded {} nodes, {} edges from JSON", node_count, edge_count))
                    }
                    Err(e) => Err(JsValue::from_str(&format!("Failed to parse graph JSON: {}", e))),
                }
            }
            Err(e) => Err(JsValue::from_str(&format!("Invalid JSON: {}", e))),
        }
    }

    /// Precompute Contraction Hierarchies
    #[wasm_bindgen]
    pub fn precompute_ch(&mut self) -> Result<String, JsValue> {
        match &self.graph {
            Some(graph) => {
                match ContractionHierarchy::precompute(graph) {
                    Ok(ch) => {
                        let shortcuts = ch.shortcut_count();
                        self.ch = Some(ch);
                        Ok(format!("✓ CH precomputed with {} shortcuts", shortcuts))
                    }
                    Err(e) => Err(JsValue::from_str(&format!("CH precomputation failed: {}", e))),
                }
            }
            None => Err(JsValue::from_str("Graph not loaded. Call load_graph_binary or load_graph_json first.")),
        }
    }

    /// Query route using A* (fallback if CH not ready)
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

    /// Query route using Contraction Hierarchies (fast)
    #[wasm_bindgen]
    pub fn query_ch(&self, from: u32, to: u32) -> Result<String, JsValue> {
        match (&self.graph, &self.ch) {
            (Some(graph), Some(ch)) => {
                match ch.query(graph, from, to) {
                    Ok(route) => Ok(serde_json::to_string(&route)
                        .map_err(|e| JsValue::from_str(&e.to_string()))?),
                    Err(e) => Err(JsValue::from_str(&format!("CH query failed: {}", e))),
                }
            }
            (None, _) => Err(JsValue::from_str("Graph not loaded")),
            (_, None) => Err(JsValue::from_str("CH not precomputed. Call precompute_ch first or use query_astar")),
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
                    "avg_degree": graph.edge_count() / graph.node_count().max(1),
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
        "1.0.0-phase1".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_router_creation() {
        let router = Router::new();
        assert_eq!(Router::version(), "1.0.0-phase1");
    }

    #[test]
    fn test_empty_graph_stats() {
        let router = Router::new();
        let result = router.graph_stats();
        assert!(result.is_err());
    }
}
