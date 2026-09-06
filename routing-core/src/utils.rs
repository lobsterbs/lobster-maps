use crate::graph::{Graph, RouteResult};
use std::collections::{BinaryHeap, HashMap};
use std::cmp::Ordering;

#[derive(Clone)]
struct State {
    cost: f32,
    node: u32,
    heuristic: f32,
}

impl Eq for State {}

impl PartialEq for State {
    fn eq(&self, other: &Self) -> bool {
        (self.cost + self.heuristic) == (other.cost + other.heuristic)
    }
}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
        (other.cost + other.heuristic)
            .partial_cmp(&(self.cost + self.heuristic))
            .unwrap_or(Ordering::Equal)
    }
}

impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub fn astar_route(graph: &Graph, from: u32, to: u32) -> Result<RouteResult, String> {
    let from_node = graph.get_node(from).ok_or("Start node not found")?;
    let to_node = graph.get_node(to).ok_or("End node not found")?;

    let target_heuristic = Graph::haversine_distance(from_node.lat, from_node.lng, to_node.lat, to_node.lng);

    let mut open_set = BinaryHeap::new();
    let mut came_from: HashMap<u32, u32> = HashMap::new();
    let mut g_score: HashMap<u32, f32> = HashMap::new();

    g_score.insert(from, 0.0);
    open_set.push(State {
        cost: 0.0,
        node: from,
        heuristic: target_heuristic,
    });

    let mut iterations = 0;
    const MAX_ITERATIONS: usize = 100000;

    while let Some(current_state) = open_set.pop() {
        iterations += 1;
        if iterations > MAX_ITERATIONS {
            return Err("A* exceeded iteration limit".to_string());
        }

        let current = current_state.node;
        let current_node = graph.get_node(current).ok_or("Node not found during search")?;

        if current == to {
            // Reconstruct path
            let mut path = vec![to];
            let mut node = to;
            while let Some(&prev) = came_from.get(&node) {
                path.push(prev);
                node = prev;
            }
            path.reverse();

            // Calculate distance and duration
            let mut total_distance = 0.0f32;
            for i in 0..path.len() - 1 {
                let from_n = graph.get_node(path[i]).unwrap();
                let to_n = graph.get_node(path[i + 1]).unwrap();
                total_distance += Graph::haversine_distance(from_n.lat, from_n.lng, to_n.lat, to_n.lng);
            }

            // Estimate duration (avg 40 km/h)
            let duration_s = (total_distance / 1000.0) / 40.0 * 3600.0;

            // Create polyline (simplified: just coordinates joined)
            let polyline = path.iter()
                .filter_map(|&id| {
                    graph.get_node(id).map(|n| format!("{:.6},{:.6}", n.lat, n.lng))
                })
                .collect::<Vec<_>>()
                .join("|");

            return Ok(RouteResult {
                distance_m: total_distance,
                duration_s: duration_s,
                node_sequence: path,
                polyline,
            });
        }

        for edge in graph.get_adjacent_edges(current) {
            let neighbor = if edge.from == current { edge.to } else { edge.from };
            let tentative_g = g_score[&current] + edge.weight;

            let neighbor_g = g_score.get(&neighbor).copied().unwrap_or(f32::INFINITY);
            if tentative_g < neighbor_g {
                came_from.insert(neighbor, current);
                g_score.insert(neighbor, tentative_g);

                let neighbor_node = graph.get_node(neighbor).unwrap();
                let h = Graph::haversine_distance(neighbor_node.lat, neighbor_node.lng, to_node.lat, to_node.lng);

                open_set.push(State {
                    cost: tentative_g,
                    node: neighbor,
                    heuristic: h,
                });
            }
        }
    }

    Err("No path found".to_string())
}

pub fn encode_polyline(coords: &[(f64, f64)]) -> String {
    let mut result = String::new();
    let mut prev_lat = 0i32;
    let mut prev_lng = 0i32;

    for (lat, lng) in coords {
        let curr_lat = (lat * 1e5) as i32;
        let curr_lng = (lng * 1e5) as i32;

        encode_value(&mut result, curr_lat - prev_lat);
        encode_value(&mut result, curr_lng - prev_lng);

        prev_lat = curr_lat;
        prev_lng = curr_lng;
    }

    result
}

fn encode_value(result: &mut String, value: i32) {
    let mut v = if value < 0 { ((-value) << 1) - 1 } else { value << 1 };
    while v >= 0x20 {
        let byte = ((v & 0x1f) | 0x20) as u8;
        result.push((byte + 63) as char);
        v >>= 5;
    }
    result.push((v as u8 + 63) as char);
}
