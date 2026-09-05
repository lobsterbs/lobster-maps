import { readFileSync } from 'fs';
import { join } from 'path';
import PriorityQueue from 'js-priority-queue';

export interface RouteNode {
  id: string;
  lat: number;
  lng: number;
}

export interface RouteEdge {
  from: string;
  to: string;
  distance: number; // meters
  speedLimit: number; // km/h (calculated from OSM way type)
  wayType: string; // primary, secondary, residential, etc.
  name?: string;
  isClosed?: boolean;
  restrictions?: {
    noUTurn?: boolean;
    maxWeight?: number; // tons
    maxHeight?: number; // meters
    access?: string; // private, delivery, etc.
  };
}

export interface RoutingGraph {
  nodes: Map<string, RouteNode>;
  edges: Map<string, RouteEdge[]>; // outgoing edges from node ID
  edgesByGeometry: RouteEdge[]; // all edges for spatial queries
  metadata: {
    region: string;
    extractDate: string;
    boundingBox: [number, number, number, number]; // [minLat, minLng, maxLat, maxLng]
  };
}

export interface RouteResult {
  path: RouteNode[];
  distance: number; // meters
  duration: number; // seconds (with traffic predictions)
  polyline: [number, number][]; // [lng, lat] for display
  steps: RouteStep[];
  trafficFactors: TrafficFactor[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  location: [number, number];
}

export interface TrafficFactor {
  edgeId: string;
  baseSpeed: number;
  predictedSpeed: number; // after learning model
  factor: number; // multiplier on duration
  reason: string; // "rush_hour", "incident", "weather", etc.
}

class TrafficPredictor {
  private patterns: Map<string, DayPattern> = new Map(); // key: "HH:MM:dayOfWeek"
  private updateInterval = 3600000; // 1 hour
  private lastUpdate = 0;

  constructor() {
    this.initializeDefaultPatterns();
  }

  private initializeDefaultPatterns() {
    // Default rush hour patterns for Bergen/Vestland
    // Time: HH:MM, dayOfWeek: 0-6 (Sun-Sat)
    const patterns: Record<string, Partial<DayPattern>> = {
      '07:00:weekday': { speedMultiplier: 0.6, congestion: 'high' },
      '08:00:weekday': { speedMultiplier: 0.5, congestion: 'very_high' },
      '09:00:weekday': { speedMultiplier: 0.65, congestion: 'high' },
      '12:00:weekday': { speedMultiplier: 0.75, congestion: 'medium' },
      '16:00:weekday': { speedMultiplier: 0.55, congestion: 'very_high' },
      '17:00:weekday': { speedMultiplier: 0.5, congestion: 'very_high' },
      '18:00:weekday': { speedMultiplier: 0.65, congestion: 'high' },
      '20:00:weekday': { speedMultiplier: 0.85, congestion: 'low' },
      '22:00:weekday': { speedMultiplier: 0.95, congestion: 'minimal' },
      '23:00:weekday': { speedMultiplier: 0.95, congestion: 'minimal' },
      '10:00:weekend': { speedMultiplier: 0.85, congestion: 'low' },
      '15:00:weekend': { speedMultiplier: 0.8, congestion: 'medium' },
      '18:00:weekend': { speedMultiplier: 0.75, congestion: 'medium' },
    };

    for (const [key, partial] of Object.entries(patterns)) {
      this.patterns.set(key, {
        speedMultiplier: partial.speedMultiplier || 1.0,
        congestion: partial.congestion || 'none',
        trafficIncidents: [],
        weather: 'clear',
        confidence: 0.7,
      });
    }
  }

  predictSpeed(
    baseSpeed: number,
    hour: number,
    minute: number,
    dayOfWeek: number
  ): { speed: number; factor: number; reason: string } {
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const timeKey = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${
      isWeekday ? 'weekday' : 'weekend'
    }`;

    // Look for exact match or fall back to :00 of same hour
    let pattern =
      this.patterns.get(timeKey) ||
      this.patterns.get(
        `${String(hour).padStart(2, '0')}:00:${isWeekday ? 'weekday' : 'weekend'}`
      );

    if (!pattern) {
      // Default: minimal congestion outside rush hours
      pattern = {
        speedMultiplier: 0.95,
        congestion: 'minimal',
        trafficIncidents: [],
        weather: 'clear',
        confidence: 0.5,
      };
    }

    const predictedSpeed = baseSpeed * pattern.speedMultiplier;
    return {
      speed: predictedSpeed,
      factor: pattern.speedMultiplier,
      reason: `${pattern.congestion}_${timeKey}`,
    };
  }

  learn(
    hour: number,
    minute: number,
    dayOfWeek: number,
    observedSpeedMultiplier: number,
    congestion: 'minimal' | 'low' | 'medium' | 'high' | 'very_high'
  ) {
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const timeKey = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${
      isWeekday ? 'weekday' : 'weekend'
    }`;

    let pattern = this.patterns.get(timeKey);
    if (!pattern) {
      pattern = {
        speedMultiplier: observedSpeedMultiplier,
        congestion,
        trafficIncidents: [],
        weather: 'clear',
        confidence: 0.5,
      };
    } else {
      // Exponential moving average: new = 0.3 * observed + 0.7 * old
      pattern.speedMultiplier = 0.3 * observedSpeedMultiplier + 0.7 * pattern.speedMultiplier;
      pattern.congestion = congestion;
      pattern.confidence = Math.min(1.0, pattern.confidence + 0.1);
    }

    this.patterns.set(timeKey, pattern);
  }
}

interface DayPattern {
  speedMultiplier: number;
  congestion: 'minimal' | 'low' | 'medium' | 'high' | 'very_high' | 'none';
  trafficIncidents: string[];
  weather: string;
  confidence: number;
}

export class Router {
  private graph: RoutingGraph | null = null;
  private trafficPredictor = new TrafficPredictor();

  loadGraph(graphPath: string): void {
    try {
      const graphData = readFileSync(graphPath, 'utf-8');
      const parsed = JSON.parse(graphData);

      this.graph = {
        nodes: new Map(parsed.nodes),
        edges: new Map(parsed.edges),
        edgesByGeometry: parsed.edgesByGeometry || [],
        metadata: parsed.metadata,
      };

      console.log(
        `Loaded graph: ${this.graph.nodes.size} nodes, ${this.graph.edges.size} edge sets`
      );
    } catch (err) {
      throw new Error(`Failed to load routing graph: ${err}`);
    }
  }

  route(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    departureTime?: Date,
    closedWayIds?: string[]
  ): RouteResult {
    if (!this.graph) {
      throw new Error('Graph not loaded. Call loadGraph() first.');
    }

    const fromNode = this.findNearestNode(fromLat, fromLng);
    const toNode = this.findNearestNode(toLat, toLng);

    if (!fromNode || !toNode) {
      throw new Error('Could not find route start or end near provided coordinates');
    }

    const now = departureTime || new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay();

    const { path, distance, duration, trafficFactors } = this.aStar(
      fromNode.id,
      toNode.id,
      hour,
      minute,
      dayOfWeek,
      closedWayIds || []
    );

    const polyline = this.pathToPolyline(path);
    const steps = this.generateSteps(path);

    return {
      path,
      distance,
      duration,
      polyline,
      steps,
      trafficFactors,
    };
  }

  private aStar(
    startId: string,
    goalId: string,
    hour: number,
    minute: number,
    dayOfWeek: number,
    closedWayIds: string[]
  ): {
    path: RouteNode[];
    distance: number;
    duration: number;
    trafficFactors: TrafficFactor[];
  } {
    const openSet = new PriorityQueue({
      comparator: (a: AStarNode, b: AStarNode) => a.fScore - b.fScore,
    });

    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const trafficFactors: TrafficFactor[] = [];

    const start = this.graph!.nodes.get(startId)!;
    const goal = this.graph!.nodes.get(goalId)!;

    const h = this.heuristic(start, goal);
    gScore.set(startId, 0);
    fScore.set(startId, h);

    openSet.queue({ id: startId, fScore: h } as AStarNode);

    while (openSet.length > 0) {
      const current = openSet.dequeue() as AStarNode;

      if (current.id === goalId) {
        return this.reconstructPath(
          cameFrom,
          goalId,
          gScore,
          hour,
          minute,
          dayOfWeek,
          trafficFactors
        );
      }

      const neighbors = this.graph!.edges.get(current.id) || [];

      for (const edge of neighbors) {
        if (edge.isClosed || closedWayIds.includes(edge.from)) {
          continue; // Skip closed roads
        }

        const neighbor = this.graph!.nodes.get(edge.to);
        if (!neighbor) continue;

        const { speed, factor, reason } = this.trafficPredictor.predictSpeed(
          edge.speedLimit,
          hour,
          minute,
          dayOfWeek
        );

        const edgeDuration = (edge.distance / 1000 / speed) * 3600; // seconds
        const tentativeGScore = (gScore.get(current.id) || 0) + edgeDuration;

        if (!gScore.has(edge.to) || tentativeGScore < gScore.get(edge.to)!) {
          cameFrom.set(edge.to, current.id);
          gScore.set(edge.to, tentativeGScore);

          const hCost = this.heuristic(neighbor, goal);
          fScore.set(edge.to, tentativeGScore + hCost);

          openSet.queue({
            id: edge.to,
            fScore: tentativeGScore + hCost,
          } as AStarNode);

          trafficFactors.push({
            edgeId: edge.from,
            baseSpeed: edge.speedLimit,
            predictedSpeed: speed,
            factor,
            reason,
          });
        }
      }
    }

    throw new Error('No path found');
  }

  private reconstructPath(
    cameFrom: Map<string, string>,
    current: string,
    gScore: Map<string, number>,
    hour: number,
    minute: number,
    dayOfWeek: number,
    trafficFactors: TrafficFactor[]
  ): {
    path: RouteNode[];
    distance: number;
    duration: number;
    trafficFactors: TrafficFactor[];
  } {
    const path: RouteNode[] = [];
    let totalDistance = 0;
    let totalDuration = 0;

    const node = this.graph!.nodes.get(current)!;
    path.push(node);

    while (cameFrom.has(current)) {
      const prev = cameFrom.get(current)!;

      const edges = this.graph!.edges.get(prev) || [];
      const edge = edges.find((e) => e.to === current);

      if (edge) {
        totalDistance += edge.distance;
        const { speed } = this.trafficPredictor.predictSpeed(
          edge.speedLimit,
          hour,
          minute,
          dayOfWeek
        );
        totalDuration += (edge.distance / 1000 / speed) * 3600;
      }

      const prevNode = this.graph!.nodes.get(prev)!;
      path.unshift(prevNode);
      current = prev;
    }

    return {
      path,
      distance: totalDistance,
      duration: Math.round(totalDuration),
      trafficFactors,
    };
  }

  private heuristic(from: RouteNode, to: RouteNode): number {
    // Haversine distance in km, divided by average speed (80 km/h)
    const R = 6371; // Earth radius in km
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.lat * Math.PI) / 180) *
        Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Return estimated seconds (assume 80 km/h average)
    return (distanceKm / 80) * 3600;
  }

  private findNearestNode(lat: number, lng: number): RouteNode | null {
    if (!this.graph) return null;

    let nearest: RouteNode | null = null;
    let minDistance = Infinity;

    for (const node of this.graph.nodes.values()) {
      const dist = this.distance(lat, lng, node.lat, node.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = node;
      }
    }

    return minDistance < 500 ? nearest : null; // Max 500m snap
  }

  private distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private pathToPolyline(path: RouteNode[]): [number, number][] {
    return path.map((node) => [node.lng, node.lat]);
  }

  private generateSteps(path: RouteNode[]): RouteStep[] {
    // Simplified: return waypoints as steps
    // In production, you'd extract actual turn instructions from OSM
    return path.slice(0, Math.min(path.length, 20)).map((node, idx) => ({
      instruction: `Continue on route (${idx + 1}/${path.length})`,
      distance: 0,
      duration: 0,
      location: [node.lng, node.lat],
    }));
  }

  recordTraffic(speedMultiplier: number, hour: number, minute: number, dayOfWeek: number) {
    const congestion = this.classifyCongestion(speedMultiplier);
    this.trafficPredictor.learn(hour, minute, dayOfWeek, speedMultiplier, congestion);
  }

  private classifyCongestion(
    multiplier: number
  ): 'minimal' | 'low' | 'medium' | 'high' | 'very_high' {
    if (multiplier >= 0.95) return 'minimal';
    if (multiplier >= 0.85) return 'low';
    if (multiplier >= 0.7) return 'medium';
    if (multiplier >= 0.5) return 'high';
    return 'very_high';
  }
}

interface AStarNode {
  id: string;
  fScore: number;
}
