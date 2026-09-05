//! Graph data structures for Contraction Hierarchies
//! 
//! Stores roads as flat binary arrays: O(1) access, minimal memory

pub struct Graph {
    pub node_ids: Vec<u32>,
    pub node_lats: Vec<f64>,
    pub node_lngs: Vec<f64>,
    pub edge_from: Vec<u32>,
    pub edge_to: Vec<u32>,
    pub edge_weight: Vec<f32>,
    pub edge_speed: Vec<f32>,
}

impl Graph {
    pub fn new() -> Self {
        Graph {
            node_ids: Vec::new(),
            node_lats: Vec::new(),
            node_lngs: Vec::new(),
            edge_from: Vec::new(),
            edge_to: Vec::new(),
            edge_weight: Vec::new(),
            edge_speed: Vec::new(),
        }
    }
    
    pub fn node_count(&self) -> usize {
        self.node_lats.len()
    }
    
    pub fn edge_count(&self) -> usize {
        self.edge_from.len()
    }
}
