#[cfg(test)]
mod bidirectional_ch_tests {
    use routing_core::graph::Graph;
    use routing_core::bidirectional_ch::BidirectionalCH;

    fn create_simple_linear_graph(n: u32) -> Graph {
        let mut graph = Graph::new();
        for i in 0..n {
            graph.add_node(i, 60.0 + (i as f64) * 0.01, 5.0);
        }
        for i in 0..n - 1 {
            graph.add_edge(i, i + 1, 100.0, 50.0, false);
        }
        graph
    }

    fn create_grid_graph(size: u32) -> Graph {
        let mut graph = Graph::new();
        
        for i in 0..size {
            for j in 0..size {
                let id = i * size + j;
                graph.add_node(id, 60.0 + (i as f64) * 0.01, 5.0 + (j as f64) * 0.01);
            }
        }

        for i in 0..size {
            for j in 0..size {
                let id = i * size + j;
                if j + 1 < size {
                    graph.add_edge(id, id + 1, 100.0, 50.0, false);
                }
                if i + 1 < size {
                    graph.add_edge(id, id + size, 100.0, 50.0, false);
                }
            }
        }
        graph
    }

    #[test]
    fn test_linear_path_3_nodes() {
        let graph = create_simple_linear_graph(3);
        let mut ch = BidirectionalCH::new();
        ch.load_graph(graph);
        let result = ch.query(0, 2);
        assert!(result.is_ok());
        let route = result.unwrap();
        assert_eq!(route.node_sequence.len(), 3);
    }

    #[test]
    fn test_linear_path_10_nodes() {
        let graph = create_simple_linear_graph(10);
        let mut ch = BidirectionalCH::new();
        ch.load_graph(graph);
        let result = ch.query(0, 9);
        assert!(result.is_ok());
        let route = result.unwrap();
        assert_eq!(route.node_sequence.len(), 10);
    }

    #[test]
    fn test_same_source_target() {
        let graph = create_simple_linear_graph(3);
        let mut ch = BidirectionalCH::new();
        ch.load_graph(graph);
        let result = ch.query(1, 1);
        assert!(result.is_ok());
        let route = result.unwrap();
        assert_eq!(route.node_sequence.len(), 1);
    }

    #[test]
    fn test_adjacent_nodes() {
        let graph = create_simple_linear_graph(5);
        let mut ch = BidirectionalCH::new();
        ch.load_graph(graph);
        let result = ch.query(2, 3);
        assert!(result.is_ok());
        let route = result.unwrap();
        assert_eq!(route.node_sequence.len(), 2);
    }

    #[test]
    fn test_grid_path() {
        let graph = create_grid_graph(5);
        let mut ch = BidirectionalCH::new();
        ch.load_graph(graph);
        let result = ch.query(0, 24);
        assert!(result.is_ok());
        let route = result.unwrap();
        assert!(route.node_sequence.len() >= 8);
    }

    #[test]
    fn test_reverse_direction() {
        let graph = create_simple_linear_graph(5);
        let mut ch = BidirectionalCH::new();
        ch.load_graph(graph);
        let result_forward = ch.query(0, 4);
        let result_backward = ch.query(4, 0);
        assert!(result_forward.is_ok());
        assert!(result_backward.is_ok());
        
        let forward = result_forward.unwrap();
        let backward = result_backward.unwrap();
        assert_eq!(forward.distance_m, backward.distance_m);
    }

    #[test]
    fn test_disconnected_graph() {
        let mut graph = Graph::new();
        graph.add_node(0, 60.0, 5.0);
        graph.add_node(1, 60.1, 5.0);
        graph.add_edge(0, 1, 100.0, 50.0, false);

        graph.add_node(2, 61.0, 6.0);
        graph.add_node(3, 61.1, 6.0);
        graph.add_edge(2, 3, 100.0, 50.0, false);

        let mut ch = BidirectionalCH::new();
        ch.load_graph(graph);

        let result = ch.query(0, 1);
        assert!(result.is_ok());

        let result_cross = ch.query(0, 3);
        assert!(result_cross.is_err());
    }

    #[test]
    fn test_large_graph_performance() {
        let graph = create_simple_linear_graph(1000);
        let mut ch = BidirectionalCH::new();
        ch.load_graph(graph);

        let start = std::time::Instant::now();
        let result = ch.query(0, 999);
        let elapsed = start.elapsed();

        assert!(result.is_ok());
        assert!(elapsed.as_millis() < 100);
    }
}
