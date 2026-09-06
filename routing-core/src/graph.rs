use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Node {
    pub id: u32,
    pub lat: f64,
    pub lng: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Edge {
    pub from: u32,
    pub to: u32,
    pub weight: f32,        // meters
    pub speed_kmh: f32,     // average speed
    pub is_oneway: bool,
}

pub struct Graph {
    nodes: Vec<Node>,
    edges: Vec<Edge>,
    adjacency: HashMap<u32, Vec<usize>>,  // node_id -> edge indices
}

impl Graph {
    pub fn new() -> Self {
        Graph {
            nodes: Vec::new(),
            edges: Vec::new(),
            adjacency: HashMap::new(),
        }
    }

    pub fn add_node(&mut self, id: u32, lat: f64, lng: f64) {
        self.nodes.push(Node { id, lat, lng });
    }

    pub fn add_edge(&mut self, from: u32, to: u32, weight: f32, speed_kmh: f32, is_oneway: bool) {
        let edge_idx = self.edges.len();
        self.edges.push(Edge {
            from,
            to,
            weight,
            speed_kmh,
            is_oneway,
        });

        self.adjacency.entry(from).or_insert_with(Vec::new).push(edge_idx);
        if !is_oneway {
            self.adjacency.entry(to).or_insert_with(Vec::new).push(edge_idx);
        }
    }

    pub fn node_count(&self) -> u32 {
        self.nodes.len() as u32
    }

    pub fn edge_count(&self) -> u32 {
        self.edges.len() as u32
    }

    pub fn memory_usage(&self) -> usize {
        std::mem::size_of_val(&self.nodes) + std::mem::size_of_val(&self.edges)
    }

    pub fn get_node(&self, id: u32) -> Option<&Node> {
        self.nodes.iter().find(|n| n.id == id)
    }

    pub fn get_adjacent_edges(&self, node_id: u32) -> Vec<&Edge> {
        match self.adjacency.get(&node_id) {
            Some(indices) => indices.iter().map(|&i| &self.edges[i]).collect(),
            None => Vec::new(),
        }
    }

    pub fn haversine_distance(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f32 {
        const EARTH_RADIUS_M: f64 = 6371000.0;
        let lat1_rad = lat1.to_radians();
        let lat2_rad = lat2.to_radians();
        let delta_lat = (lat2 - lat1).to_radians();
        let delta_lng = (lng2 - lng1).to_radians();

        let a = (delta_lat / 2.0).sin().powi(2) +
                lat1_rad.cos() * lat2_rad.cos() * (delta_lng / 2.0).sin().powi(2);
        let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

        (EARTH_RADIUS_M * c) as f32
    }

    // Binary format: Header + Nodes + Edges
    // Header: "LOBMAP01" (8) + version (4) + node_count (4) + edge_count (4) = 20 bytes
    // Each Node: lat (8) + lng (8) = 16 bytes
    // Each Edge: from (4) + to (4) + weight (4) + speed (4) + oneway (1) + padding (3) = 20 bytes
    pub fn from_binary(buffer: &[u8]) -> Result<Graph, String> {
        if buffer.len() < 20 {
            return Err("Buffer too small for header".to_string());
        }

        // Check magic
        if &buffer[0..8] != b"LOBMAP01" {
            return Err("Invalid magic number".to_string());
        }

        let version = u32::from_le_bytes([buffer[8], buffer[9], buffer[10], buffer[11]]);
        if version != 1 {
            return Err(format!("Unsupported version: {}", version));
        }

        let node_count = u32::from_le_bytes([buffer[12], buffer[13], buffer[14], buffer[15]]) as usize;
        let edge_count = u32::from_le_bytes([buffer[16], buffer[17], buffer[18], buffer[19]]) as usize;

        let mut graph = Graph::new();
        let mut offset = 20;

        // Parse nodes
        for i in 0..node_count {
            if offset + 16 > buffer.len() {
                return Err("Truncated node data".to_string());
            }
            let lat = f64::from_le_bytes([
                buffer[offset], buffer[offset+1], buffer[offset+2], buffer[offset+3],
                buffer[offset+4], buffer[offset+5], buffer[offset+6], buffer[offset+7],
            ]);
            let lng = f64::from_le_bytes([
                buffer[offset+8], buffer[offset+9], buffer[offset+10], buffer[offset+11],
                buffer[offset+12], buffer[offset+13], buffer[offset+14], buffer[offset+15],
            ]);
            graph.add_node(i as u32, lat, lng);
            offset += 16;
        }

        // Parse edges
        for _ in 0..edge_count {
            if offset + 20 > buffer.len() {
                return Err("Truncated edge data".to_string());
            }
            let from = u32::from_le_bytes([buffer[offset], buffer[offset+1], buffer[offset+2], buffer[offset+3]]);
            let to = u32::from_le_bytes([buffer[offset+4], buffer[offset+5], buffer[offset+6], buffer[offset+7]]);
            let weight = f32::from_le_bytes([buffer[offset+8], buffer[offset+9], buffer[offset+10], buffer[offset+11]]);
            let speed_kmh = f32::from_le_bytes([buffer[offset+12], buffer[offset+13], buffer[offset+14], buffer[offset+15]]);
            let is_oneway = buffer[offset+16] != 0;

            graph.add_edge(from, to, weight, speed_kmh, is_oneway);
            offset += 20;
        }

        Ok(graph)
    }

    pub fn from_json(json_str: &str) -> Result<Graph, String> {
        let json: serde_json::Value = serde_json::from_str(json_str)
            .map_err(|e| format!("JSON parse error: {}", e))?;

        let mut graph = Graph::new();

        // Parse nodes
        if let Some(nodes) = json.get("nodes").and_then(|v| v.as_array()) {
            for node_val in nodes {
                if let (Some(id), Some(lat), Some(lng)) = (
                    node_val.get("id").and_then(|v| v.as_u64()),
                    node_val.get("lat").and_then(|v| v.as_f64()),
                    node_val.get("lng").and_then(|v| v.as_f64()),
                ) {
                    graph.add_node(id as u32, lat, lng);
                }
            }
        }

        // Parse edges
        if let Some(edges) = json.get("edges").and_then(|v| v.as_array()) {
            for edge_val in edges {
                if let (Some(from), Some(to), Some(weight), Some(speed)) = (
                    edge_val.get("from").and_then(|v| v.as_u64()),
                    edge_val.get("to").and_then(|v| v.as_u64()),
                    edge_val.get("weight").and_then(|v| v.as_f64()),
                    edge_val.get("speed").and_then(|v| v.as_f64()),
                ) {
                    let is_oneway = edge_val.get("oneway").and_then(|v| v.as_bool()).unwrap_or(false);
                    graph.add_edge(from as u32, to as u32, weight as f32, speed as f32, is_oneway);
                }
            }
        }

        Ok(graph)
    }

    pub fn to_binary(&self) -> Vec<u8> {
        let mut buffer = Vec::new();
        buffer.extend_from_slice(b"LOBMAP01");
        buffer.extend_from_slice(&1u32.to_le_bytes());
        buffer.extend_from_slice(&(self.nodes.len() as u32).to_le_bytes());
        buffer.extend_from_slice(&(self.edges.len() as u32).to_le_bytes());

        for node in &self.nodes {
            buffer.extend_from_slice(&node.lat.to_le_bytes());
            buffer.extend_from_slice(&node.lng.to_le_bytes());
        }

        for edge in &self.edges {
            buffer.extend_from_slice(&edge.from.to_le_bytes());
            buffer.extend_from_slice(&edge.to.to_le_bytes());
            buffer.extend_from_slice(&edge.weight.to_le_bytes());
            buffer.extend_from_slice(&edge.speed_kmh.to_le_bytes());
            buffer.push(if edge.is_oneway { 1 } else { 0 });
            buffer.extend_from_slice(&[0, 0, 0]); // padding
        }

        buffer
    }
}
