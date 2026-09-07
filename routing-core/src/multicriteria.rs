use crate::graph::{Graph, RoadType};
use std::collections::HashMap;

#[derive(Clone, Debug)]
pub enum RoadType {
    Highway,
    Primary,
    Secondary,
    Residential,
    Walking,
    Unknown,
}

impl RoadType {
    pub fn from_osm_way(tags: &HashMap<String, String>) -> Self {
        if let Some(highway) = tags.get("highway") {
            match highway.as_str() {
                "motorway" | "motorway_link" => RoadType::Highway,
                "trunk" | "trunk_link" => RoadType::Highway,
                "primary" | "primary_link" => RoadType::Primary,
                "secondary" | "secondary_link" => RoadType::Secondary,
                "tertiary" | "residential" | "unclassified" => RoadType::Residential,
                "footway" | "pedestrian" | "path" => RoadType::Walking,
                _ => RoadType::Unknown,
            }
        } else {
            RoadType::Unknown
        }
    }
}

#[derive(Clone, Debug)]
pub struct RouteScore {
    pub distance_m: f32,
    pub duration_s: f32,
    pub safety_score: f32,  // 0-100, highways are safer (higher)
    pub scenic_score: f32,  // 0-100, residential/walking paths are scenic (higher)
}

impl RouteScore {
    pub fn dominates(&self, other: &RouteScore) -> bool {
        // self is better in all criteria (or equal in some)
        self.distance_m <= other.distance_m
            && self.duration_s <= other.duration_s
            && self.safety_score >= other.safety_score
            && self.scenic_score >= other.scenic_score
            && (self.distance_m < other.distance_m
                || self.duration_s < other.duration_s
                || self.safety_score > other.safety_score
                || self.scenic_score > other.scenic_score)
    }
}

pub struct MultiCriteriaRouter {
    graph: Option<Graph>,
}

impl MultiCriteriaRouter {
    pub fn new() -> Self {
        MultiCriteriaRouter { graph: None }
    }

    pub fn load_graph(&mut self, graph: Graph) {
        self.graph = Some(graph);
    }

    /// Calculate time-dependent edge weight
    /// Factors in road type and rush hour
    pub fn edge_weight(
        base_distance: f32,
        road_type: &RoadType,
        current_hour: u8,
        is_weekend: bool,
    ) -> f32 {
        let type_factor = match road_type {
            RoadType::Highway => 0.8,      // 20% faster (typical speed)
            RoadType::Primary => 1.0,      // baseline
            RoadType::Secondary => 1.2,    // 20% slower
            RoadType::Residential => 1.5,  // 50% slower
            RoadType::Walking => 2.5,      // 150% slower (pedestrian pace)
            RoadType::Unknown => 1.0,      // assume average
        };

        let time_factor = if !is_weekend && ((7..10).contains(&current_hour) || (16..19).contains(&current_hour)) {
            1.5 // Rush hour: 50% slower
        } else {
            1.0
        };

        base_distance * type_factor * time_factor
    }

    /// Calculate safety score (0-100)
    /// Higher = safer
    pub fn safety_score(road_type: &RoadType) -> f32 {
        match road_type {
            RoadType::Highway => 85.0,     // Highways safer (fewer intersections)
            RoadType::Primary => 70.0,
            RoadType::Secondary => 60.0,
            RoadType::Residential => 45.0, // Residential slower but more intersections
            RoadType::Walking => 50.0,     // Walking paths moderate
            RoadType::Unknown => 50.0,
        }
    }

    /// Calculate scenic score (0-100)
    /// Higher = more scenic/pleasant
    pub fn scenic_score(road_type: &RoadType) -> f32 {
        match road_type {
            RoadType::Highway => 20.0,     // Highways boring
            RoadType::Primary => 40.0,
            RoadType::Secondary => 60.0,
            RoadType::Residential => 80.0, // Residential areas nice
            RoadType::Walking => 90.0,     // Walking paths scenic
            RoadType::Unknown => 50.0,
        }
    }

    /// Generate multiple route variants with different trade-offs
    /// Returns Pareto-optimal routes (not dominated by any other)
    pub fn generate_variants(&self, routes: Vec<RouteScore>) -> Vec<RouteScore> {
        if routes.is_empty() {
            return Vec::new();
        }

        let mut pareto = Vec::new();

        for route in routes {
            // Check if this route is dominated by any in pareto set
            let is_dominated = pareto.iter().any(|p: &RouteScore| p.dominates(&route));

            if !is_dominated {
                // Remove any routes in pareto set that are dominated by this one
                pareto.retain(|p| !route.dominates(p));
                pareto.push(route);
            }
        }

        // Sort by distance for consistency
        pareto.sort_by(|a, b| a.distance_m.partial_cmp(&b.distance_m).unwrap());

        pareto
    }

    /// Aggregate route score for ranking
    /// Weights can be adjusted based on user preferences
    pub fn aggregate_score(
        score: &RouteScore,
        prefer_speed: f32,     // 0-1, how much to prefer speed
        prefer_safety: f32,    // 0-1, how much to prefer safety
        prefer_scenic: f32,    // 0-1, how much to prefer scenic routes
    ) -> f32 {
        // Normalize scores to 0-1 range for comparison
        let speed_score = 1.0 / (1.0 + score.duration_s / 3600.0); // inverse of normalized duration
        let safety_norm = score.safety_score / 100.0;
        let scenic_norm = score.scenic_score / 100.0;

        // Weighted sum
        (speed_score * prefer_speed + safety_norm * prefer_safety + scenic_norm * prefer_scenic)
            / (prefer_speed + prefer_safety + prefer_scenic)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_edge_weight_rush_hour() {
        let base = 1000.0;
        let normal = MultiCriteriaRouter::edge_weight(&base, &RoadType::Primary, 12, false);
        let rush = MultiCriteriaRouter::edge_weight(&base, &RoadType::Primary, 8, false);

        assert!(rush > normal);
        assert!((rush - normal).abs() < 0.1); // ~50% difference
    }

    #[test]
    fn test_road_type_factors() {
        let base = 1000.0;
        let highway = MultiCriteriaRouter::edge_weight(&base, &RoadType::Highway, 12, false);
        let residential = MultiCriteriaRouter::edge_weight(&base, &RoadType::Residential, 12, false);

        assert!(highway < base); // Highways faster
        assert!(residential > base); // Residential slower
        assert!(highway < residential);
    }

    #[test]
    fn test_pareto_filtering() {
        let mut router = MultiCriteriaRouter::new();

        let routes = vec![
            RouteScore {
                distance_m: 5000.0,
                duration_s: 300.0,
                safety_score: 80.0,
                scenic_score: 40.0,
            },
            RouteScore {
                distance_m: 6000.0,
                duration_s: 280.0,
                safety_score: 70.0,
                scenic_score: 50.0,
            },
            RouteScore {
                distance_m: 4500.0,
                duration_s: 320.0,
                safety_score: 90.0,
                scenic_score: 30.0,
            },
        ];

        let pareto = router.generate_variants(routes);
        assert!(pareto.len() >= 2);
        assert!(pareto.len() <= 3);
    }

    #[test]
    fn test_safety_scores() {
        let highway = MultiCriteriaRouter::safety_score(&RoadType::Highway);
        let residential = MultiCriteriaRouter::safety_score(&RoadType::Residential);
        assert!(highway > residential);
    }

    #[test]
    fn test_scenic_scores() {
        let walking = MultiCriteriaRouter::scenic_score(&RoadType::Walking);
        let highway = MultiCriteriaRouter::scenic_score(&RoadType::Highway);
        assert!(walking > highway);
    }
}
