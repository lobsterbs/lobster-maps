/* tslint:disable */
/* eslint-disable */

export class Business {
    free(): void;
    [Symbol.dispose](): void;
    constructor(id: number, name: string, lat: number, lon: number, category: string);
    category: string;
    lat: number;
    lon: number;
    name: string;
}

export class RateLimiter {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Check if request is allowed and consume token if yes
     * Returns: (allowed: bool, remaining_tokens: u32)
     */
    allow_request(): number;
    /**
     * Get remaining tokens without consuming
     */
    get_remaining(): number;
    constructor(capacity: number, refill_rate: number);
    /**
     * Reset to full capacity
     */
    reset(): void;
}

export class Router {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get graph statistics
     */
    graph_stats(): string;
    /**
     * Load graph from binary format
     */
    load_graph_binary(buffer: Uint8Array): string;
    /**
     * Load graph from JSON (debug/testing)
     */
    load_graph_json(json_str: string): string;
    constructor();
    /**
     * Query route using A* (fallback)
     */
    query_astar(from: number, to: number): string;
    /**
     * Query using bidirectional Dijkstra (fast, optimal)
     */
    query_bidirectional(from: number, to: number): string;
    /**
     * Get router status
     */
    status(): string;
    /**
     * Get router version
     */
    static version(): string;
}

export class WeatherCache {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Add weather condition for grid cell
     */
    add_condition(lat: number, lon: number, code: number, wind_speed: number, precipitation_rate: number): void;
    /**
     * Cell count
     */
    cell_count(): number;
    /**
     * Clear cache
     */
    clear(): void;
    /**
     * Get delay for edge (O(1) lookup)
     */
    get_delay_for_edge(lat: number, lon: number): number;
    /**
     * Get average delay for route
     */
    get_route_delay(lats: Float64Array, lons: Float64Array): number;
    /**
     * Check if stale (>1h old)
     */
    is_stale(): boolean;
    constructor();
}

/**
 * Score a business based on query match and distance
 * Returns: 0.0 (no match) → 100.0 (perfect match at location)
 */
export function score_business(query: string, name: string, category: string, user_lat: number, user_lon: number, business_lat: number, business_lon: number): number;

/**
 * Batch score multiple businesses
 */
export function score_businesses_batch(query: string, businesses_json: string, user_lat: number, user_lon: number): string;
