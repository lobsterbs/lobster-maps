use crate::graph::{Graph, Edge, RouteResult};
use std::collections::{BinaryHeap, HashMap};
use std::cmp::Ordering;

#[derive(Clone, Eq, PartialEq)]
struct State {
    cost: f32,
    node: u32,
}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
        other.cost.partial_cmp(&self.cost).unwrap_or(Ordering::Equal)
    }
}

impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub struct BidirectionalCH {
    graph: Option<Graph>,
}

impl BidirectionalCH {
    pub fn new() -> Self {
        BidirectionalCH { graph: None }
    }

    pub fn load_graph(&mut self, graph: Graph) {
        self.graph = Some(graph);
    }

    /// Bidirectional Dijkstra with meeting point detection
    /// Searches forward from source and backward from target simultaneously
    /// Returns path when searches meet
    pub fn query(&self, from: u32, to: u32) -> Result<RouteResult, String> {
        let graph = self.graph.as_ref().ok_or("Graph not loaded")?;

        let from_node = graph.get_node(from).ok_or("Start node not found")?;
        let to_node = graph.get_node(to).ok_or("End node not found")?;

        let mut dist_forward: HashMap<u32, f32> = HashMap::new();
        let mut dist_backward: HashMap<u32, f32> = HashMap::new();
        let mut parent_forward: HashMap<u32, u32> = HashMap::new();
        let mut parent_backward: HashMap<u32, u32> = HashMap::new();

        let mut open_forward = BinaryHeap::new();
        let mut open_backward = BinaryHeap::new();

        dist_forward.insert(from, 0.0);
        dist_backward.insert(to, 0.0);

        open_forward.push(State { cost: 0.0, node: from });
        open_backward.push(State { cost: 0.0, node: to });

        let mut best_distance = f32::INFINITY;
        let mut best_meeting = None;

        let max_iterations = 10000;
        let mut forward_iterations = 0;
        let mut backward_iterations = 0;

        loop {
            let should_expand_forward = open_forward.peek().map(|s| s.cost).unwrap_or(f32::INFINITY)
                < open_backward.peek().map(|s| s.cost).unwrap_or(f32::INFINITY);

            if should_expand_forward {
                // Forward search
                if let Some(State { cost, node }) = open_forward.pop() {
                    forward_iterations += 1;
                    if forward_iterations > max_iterations {
                        return Err("Bidirectional search exceeded iteration limit".to_string());
                    }

                    if cost > dist_forward.get(&node).copied().unwrap_or(f32::INFINITY) {
                        continue; // Already processed
                    }

                    // Check if this node was reached from backward search
                    if let Some(&back_dist) = dist_backward.get(&node) {
                        let total = cost + back_dist;
                        if total < best_distance {
                            best_distance = total;
                            best_meeting = Some(node);
                        }
                    }

                    // Expand neighbors
                    for edge in graph.get_adjacent_edges(node) {
                        let neighbor = if edge.from == node { edge.to } else { edge.from };
                        let new_cost = cost + edge.weight;

                        if new_cost < dist_forward.get(&neighbor).copied().unwrap_or(f32::INFINITY) {
                            dist_forward.insert(neighbor, new_cost);
                            parent_forward.insert(neighbor, node);

                            // Check for meeting point
                            if let Some(&back_dist) = dist_backward.get(&neighbor) {
                                let total = new_cost + back_dist;
                                if total < best_distance {
                                    best_distance = total;
                                    best_meeting = Some(neighbor);
                                }
                            }

                            open_forward.push(State {
                                cost: new_cost,
                                node: neighbor,
                            });
                        }
                    }
                }
            } else {
                // Backward search
                if let Some(State { cost, node }) = open_backward.pop() {
                    backward_iterations += 1;
                    if backward_iterations > max_iterations {
                        return Err("Bidirectional search exceeded iteration limit".to_string());
                    }

                    if cost > dist_backward.get(&node).copied().unwrap_or(f32::INFINITY) {
                        continue; // Already processed
                    }

                    // Check if this node was reached from forward search
                    if let Some(&fwd_dist) = dist_forward.get(&node) {
                        let total = fwd_dist + cost;
                        if total < best_distance {
                            best_distance = total;
                            best_meeting = Some(node);
                        }
                    }

                    // Expand neighbors (reverse edges)
                    for edge in graph.get_adjacent_edges(node) {
                        let neighbor = if edge.from == node { edge.to } else { edge.from };
                        let new_cost = cost + edge.weight;

                        if new_cost < dist_backward.get(&neighbor).copied().unwrap_or(f32::INFINITY) {
                            dist_backward.insert(neighbor, new_cost);
                            parent_backward.insert(neighbor, node);

                            // Check for meeting point
                            if let Some(&fwd_dist) = dist_forward.get(&neighbor) {
                                let total = fwd_dist + new_cost;
                                if total < best_distance {
                                    best_distance = total;
                                    best_meeting = Some(neighbor);
                                }
                            }

                            open_backward.push(State {
                                cost: new_cost,
                                node: neighbor,
                            });
                        }
                    }
                }
            }

            // Termination: both queues empty or pruned by best distance
            let min_forward = open_forward.peek().map(|s| s.cost).unwrap_or(f32::INFINITY);
            let min_backward = open_backward.peek().map(|s| s.cost).unwrap_or(f32::INFINITY);

            if (min_forward + min_backward) >= best_distance {
                break;
            }

            if open_forward.is_empty() && open_backward.is_empty() {
                break;
            }
        }

        if let Some(meeting) = best_meeting {
            // Reconstruct path
            let mut path_forward = vec![meeting];
            let mut current = meeting;
            while let Some(&prev) = parent_forward.get(&current) {
                path_forward.push(prev);
                current = prev;
            }
            path_forward.reverse();

            let mut path_backward = Vec::new();
            current = meeting;
            while let Some(&next) = parent_backward.get(&current) {
                path_backward.push(next);
                current = next;
            }

            let mut full_path = path_forward;
            full_path.extend(path_backward);

            // Calculate polyline
            let polyline = full_path
                .iter()
                .filter_map(|&id| {
                    graph.get_node(id).map(|n| format!("{:.6},{:.6}", n.lat, n.lng))
                })
                .collect::<Vec<_>>()
                .join("|");

            let duration_s = (best_distance / 1000.0) / 40.0 * 3600.0;

            return Ok(RouteResult {
                distance_m: best_distance,
                duration_s,
                node_sequence: full_path,
                polyline,
            });
        }

        Err("No path found via bidirectional search".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bidirectional_simple_path() {
        // Simple 3-node path: 0 -> 1 -> 2
        let mut graph = Graph::new();
        graph.add_node(0, 60.0, 5.0);
        graph.add_node(1, 60.1, 5.0);
        graph.add_node(2, 60.2, 5.0);
        graph.add_edge(0, 1, 100.0, 50.0, false);
        graph.add_edge(1, 2, 100.0, 50.0, false);

        let mut ch = BidirectionalCH::new();
        ch.load_graph(graph);

        let result = ch.query(0, 2);
        assert!(result.is_ok());
        let route = result.unwrap();
        assert_eq!(route.node_sequence.len(), 3);
        assert!(route.distance_m > 190.0 && route.distance_m < 210.0);
    }

    #[test]
    fn test_same_node() {
        let mut graph = Graph::new();
        graph.add_node(0, 60.0, 5.0);

        let mut ch = BidirectionalCH::new();
        ch.load_graph(graph);

        let result = ch.query(0, 0);
        // Should find immediate path (distance 0)
        assert!(result.is_ok());
    }

    #[test]
    fn test_no_path() {
        // Disconnected graph
        let mut graph = Graph::new();
        graph.add_node(0, 60.0, 5.0);
        graph.add_node(1, 60.1, 5.0);
        graph.add_node(2, 60.2, 5.0);
        graph.add_node(3, 60.3, 5.0);

        graph.add_edge(0, 1, 100.0, 50.0, false);
        graph.add_edge(2, 3, 100.0, 50.0, false);

        let mut ch = BidirectionalCH::new();
        ch.load_graph(graph);

        let result = ch.query(0, 3);
        assert!(result.is_err());
    }
}
