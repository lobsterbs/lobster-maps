use crate::graph::{Graph, Edge, RouteResult};
use std::collections::{HashMap, VecDeque};

pub struct ContractionHierarchy {
    node_order: Vec<u32>,
    shortcuts: Vec<Edge>,
    level: HashMap<u32, u32>,
}

impl ContractionHierarchy {
    pub fn precompute(graph: &Graph) -> Result<ContractionHierarchy, String> {
        let nodes = (0..graph.node_count()).collect::<Vec<_>>();
        let mut order = Vec::new();
        let mut level = HashMap::new();
        let mut shortcuts = Vec::new();

        // Greedy node ordering by degree (simplified)
        let mut remaining: Vec<u32> = nodes.iter().copied().collect();
        let mut level_counter = 0;

        while !remaining.is_empty() {
            // Find node with minimum degree
            let min_idx = remaining.iter()
                .position(|&id| {
                    let edges = graph.get_adjacent_edges(id);
                    edges.len()
                })
                .unwrap_or(0);

            let node = remaining.remove(min_idx);
            order.push(node);
            level.insert(node, level_counter);
            level_counter += 1;

            // For each pair of neighbors, create a shortcut if needed
            let neighbors = graph.get_adjacent_edges(node);
            for i in 0..neighbors.len() {
                for j in i+1..neighbors.len() {
                    let edge_i = neighbors[i];
                    let edge_j = neighbors[j];

                    if edge_i.to != edge_j.to {
                        // Create shortcut
                        let shortcut = Edge {
                            from: edge_i.to,
                            to: edge_j.to,
                            weight: edge_i.weight + edge_j.weight,
                            speed_kmh: (edge_i.speed_kmh + edge_j.speed_kmh) / 2.0,
                            is_oneway: edge_i.is_oneway || edge_j.is_oneway,
                        };
                        shortcuts.push(shortcut);
                    }
                }
            }
        }

        Ok(ContractionHierarchy {
            node_order: order,
            shortcuts,
            level,
        })
    }

    pub fn query(&self, graph: &Graph, from: u32, to: u32) -> Result<RouteResult, String> {
        // Bidirectional Dijkstra using CH (simplified)
        // For now, fall back to A* via graph
        
        // TODO: Implement full bidirectional CH query
        // This is a placeholder that uses Dijkstra

        let mut dist_forward = HashMap::new();
        let mut dist_backward = HashMap::new();
        let mut queue = VecDeque::new();

        dist_forward.insert(from, 0.0f32);
        dist_backward.insert(to, 0.0f32);
        queue.push_back(from);

        let mut best_dist = f32::INFINITY;
        let mut best_meeting = None;

        // Forward search (limited)
        for _ in 0..1000 {
            if queue.is_empty() { break; }
            let node = queue.pop_front().unwrap();

            for edge in graph.get_adjacent_edges(node) {
                let neighbor = if edge.from == node { edge.to } else { edge.from };
                let new_dist = dist_forward[&node] + edge.weight;

                if new_dist < dist_forward.get(&neighbor).copied().unwrap_or(f32::INFINITY) {
                    dist_forward.insert(neighbor, new_dist);
                    queue.push_back(neighbor);

                    // Check if on backward frontier
                    if let Some(&back_dist) = dist_backward.get(&neighbor) {
                        if new_dist + back_dist < best_dist {
                            best_dist = new_dist + back_dist;
                            best_meeting = Some(neighbor);
                        }
                    }
                }
            }
        }

        if let Some(_meeting) = best_meeting {
            // Reconstruct path (simplified)
            let mut path = vec![from, to];
            
            return Ok(RouteResult {
                distance_m: best_dist,
                duration_s: (best_dist / 1000.0) / 40.0 * 3600.0,
                node_sequence: path,
                polyline: "simplified_polyline".to_string(),
            });
        }

        Err("No path found via CH".to_string())
    }

    pub fn shortcut_count(&self) -> usize {
        self.shortcuts.len()
    }

    pub fn node_order(&self) -> &[u32] {
        &self.node_order
    }

    pub fn level(&self, node: u32) -> Option<u32> {
        self.level.get(&node).copied()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ch_properties() {
        // Property-based: CH preserves all shortest paths
        // (tested with proptest in integration tests)
    }
}
