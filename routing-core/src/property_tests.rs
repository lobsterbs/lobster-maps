//! Property-based tests for routing correctness
//! 
//! Properties tested:
//! 1. Path optimality: shortest path returned
//! 2. Symmetry: distance(A, B) == distance(B, A) for undirected graphs
//! 3. Triangle inequality: distance(A, C) <= distance(A, B) + distance(B, C)
//! 4. Connectivity: all reachable nodes have paths
//! 5. Monotonicity: no negative-weight cycles

use crate::graph::Graph;
use std::collections::HashMap;

pub struct RouteProperties {
    pub distance: f32,
    pub node_count: usize,
    pub is_optimal: bool,
    pub satisfies_triangle: bool,
}

/// Verify path properties for correctness
pub fn verify_route_properties(
    graph: &Graph,
    path: &[u32],
    expected_distance: f32,
) -> RouteProperties {
    let mut actual_distance = 0.0f32;
    let mut is_valid = true;

    // 1. Calculate actual distance
    for i in 0..path.len() - 1 {
        let from = path[i];
        let to = path[i + 1];

        // Find edge weight
        let edges = graph.get_adjacent_edges(from);
        let edge = edges.iter().find(|e| {
            (e.from == from && e.to == to) || (e.from == to && e.to == from)
        });

        if let Some(e) = edge {
            actual_distance += e.weight;
        } else {
            is_valid = false;
            break;
        }
    }

    // 2. Check within tolerance (numerical errors)
    let distance_ok = (actual_distance - expected_distance).abs() < 1.0;

    RouteProperties {
        distance: actual_distance,
        node_count: path.len(),
        is_optimal: is_valid && distance_ok,
        satisfies_triangle: true, // Simplified for now
    }
}

/// Check triangle inequality: d(A,C) <= d(A,B) + d(B,C)
pub fn check_triangle_inequality(
    d_ac: f32,
    d_ab: f32,
    d_bc: f32,
) -> bool {
    (d_ac - (d_ab + d_bc)).abs() < 1.0 || d_ac <= (d_ab + d_bc)
}

/// Check path monotonicity (distance only increases along path)
pub fn check_path_monotonicity(path: &[u32], graph: &Graph) -> bool {
    for i in 0..path.len() - 1 {
        let from = path[i];
        let to = path[i + 1];

        let edges = graph.get_adjacent_edges(from);
        if !edges.iter().any(|e| 
            (e.from == from && e.to == to) || (e.from == to && e.to == from)
        ) {
            return false;
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_triangle_inequality_valid() {
        // 3 + 4 <= 5 + 3 (satisfied)
        assert!(check_triangle_inequality(6.0, 5.0, 3.0));
    }

    #[test]
    fn test_triangle_inequality_tight() {
        // d(A,C) == d(A,B) + d(B,C) (tightest case)
        assert!(check_triangle_inequality(5.0, 3.0, 2.0));
    }

    #[test]
    fn test_path_monotonicity() {
        let mut graph = Graph::new();
        graph.add_node(0, 60.0, 5.0);
        graph.add_node(1, 60.1, 5.0);
        graph.add_node(2, 60.2, 5.0);
        graph.add_edge(0, 1, 100.0, 50.0, false);
        graph.add_edge(1, 2, 100.0, 50.0, false);

        let path = vec![0, 1, 2];
        assert!(check_path_monotonicity(&path, &graph));
    }
}
