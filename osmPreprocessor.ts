import { writeFileSync } from 'fs';
import { join } from 'path';

// Types for OSM data
interface OSMNode {
  id: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface OSMWay {
  id: string;
  nodes: string[];
  tags: Record<string, string>;
}

interface OSMRelation {
  id: string;
  members: OSMRelationMember[];
  tags: Record<string, string>;
}

interface OSMRelationMember {
  ref: string;
  type: 'node' | 'way' | 'relation';
  role: string;
}

interface ProcessedGraph {
  nodes: [string, any][];
  edges: [string, any[]][];
  edgesByGeometry: any[];
  metadata: {
    region: string;
    extractDate: string;
    boundingBox: [number, number, number, number];
  };
}

// Speed defaults by way type (km/h)
const speedDefaults: Record<string, number> = {
  motorway: 110,
  trunk: 100,
  primary: 80,
  secondary: 60,
  tertiary: 50,
  unclassified: 40,
  residential: 30,
  service: 20,
  footway: 5,
  path: 5,
  cycleway: 25,
  track: 20,
};

// Access restrictions by way type
const accessRestrictions: Record<string, boolean> = {
  motorway: true,
  trunk: true,
  footway: false, // No cars
  path: false,
  cycleway: false,
};

export class OSMPreprocessor {
  private nodes: Map<string, OSMNode> = new Map();
  private ways: Map<string, OSMWay> = new Map();
  private turnRestrictions: Map<string, string[]> = new Map(); // from -> [allowed_to]

  /**
   * Process Overpass API response JSON directly
   */
  processOverpassResponse(osmData: any): ProcessedGraph {
    // Extract nodes
    for (const element of osmData.elements) {
      if (element.type === 'node') {
        this.nodes.set(element.id.toString(), {
          id: element.id.toString(),
          lat: element.lat,
          lon: element.lon,
          tags: element.tags || {},
        });
      }
    }

    // Extract ways
    for (const element of osmData.elements) {
      if (element.type === 'way') {
        this.ways.set(element.id.toString(), {
          id: element.id.toString(),
          nodes: element.nodes.map((n: number) => n.toString()),
          tags: element.tags || {},
        });
      }
    }

    // Extract turn restrictions (relations)
    for (const element of osmData.elements) {
      if (element.type === 'relation' && element.tags?.type === 'restriction') {
        this.processTurnRestriction(element);
      }
    }

    // Build routable graph
    return this.buildGraph();
  }

  private processTurnRestriction(relation: any) {
    // Simplified: extract no_left_turn, no_u_turn, no_right_turn
    // Full spec: https://wiki.openstreetmap.org/wiki/Relation:restriction
    const restriction = relation.tags?.restriction;
    if (!restriction) return;

    const from = relation.members?.find((m: any) => m.role === 'from')?.ref?.toString();
    const via = relation.members?.find((m: any) => m.role === 'via')?.ref?.toString();
    const to = relation.members?.find((m: any) => m.role === 'to')?.ref?.toString();

    // Store as: "from_via" -> [allowed_to, ...]
    if (from && via && to) {
      const key = `${from}_${via}`;
      if (!this.turnRestrictions.has(key)) {
        this.turnRestrictions.set(key, []);
      }

      if (!restriction.startsWith('no_')) {
        // Only allow listed turn
        this.turnRestrictions.get(key)!.push(to);
      } else {
        // Implicit: block this specific turn (complex, would need full node adjacency)
      }
    }
  }

  private buildGraph(): ProcessedGraph {
    const graphNodes = new Map<string, any>();
    const graphEdges = new Map<string, any[]>();
    const allEdges: any[] = [];

    // Create nodes from OSM nodes
    for (const [nodeId, osmNode] of this.nodes) {
      graphNodes.set(nodeId, {
        id: nodeId,
        lat: osmNode.lat,
        lng: osmNode.lon, // GeoJSON uses lng
      });
    }

    // Create edges from ways
    for (const [wayId, way] of this.ways) {
      // Skip non-routable ways
      if (!this.isRoutable(way)) continue;

      const speedLimit = this.getSpeedLimit(way);
      const wayType = this.getWayType(way);
      const isOneWay = way.tags.oneway === 'yes';
      const name = way.tags.name || '';

      // Process each consecutive pair of nodes
      for (let i = 0; i < way.nodes.length - 1; i++) {
        const fromNodeId = way.nodes[i];
        const toNodeId = way.nodes[i + 1];

        const fromNode = this.nodes.get(fromNodeId);
        const toNode = this.nodes.get(toNodeId);

        if (!fromNode || !toNode) continue;

        // Calculate distance
        const distance = this.haversineDistance(
          fromNode.lat,
          fromNode.lon,
          toNode.lat,
          toNode.lon
        );

        const edge = {
          from: `${wayId}_${i}`, // Unique edge ID
          to: toNodeId,
          distance,
          speedLimit,
          wayType,
          name,
          wayId,
          isClosed: this.isClosed(way),
          restrictions: this.extractRestrictions(way),
        };

        // Forward direction always
        if (!graphEdges.has(fromNodeId)) {
          graphEdges.set(fromNodeId, []);
        }
        graphEdges.get(fromNodeId)!.push(edge);
        allEdges.push(edge);

        // Reverse direction if not one-way
        if (!isOneWay && way.tags.oneway !== '-1') {
          const reverseEdge = {
            ...edge,
            from: `${wayId}_${i}_rev`,
            to: fromNodeId,
          };

          if (!graphEdges.has(toNodeId)) {
            graphEdges.set(toNodeId, []);
          }
          graphEdges.get(toNodeId)!.push(reverseEdge);
          allEdges.push(reverseEdge);
        }
      }
    }

    // Find bounding box
    const lats = Array.from(this.nodes.values()).map((n) => n.lat);
    const lons = Array.from(this.nodes.values()).map((n) => n.lon);
    const bbox: [number, number, number, number] = [
      Math.min(...lats),
      Math.min(...lons),
      Math.max(...lats),
      Math.max(...lons),
    ];

    return {
      nodes: Array.from(graphNodes),
      edges: Array.from(graphEdges),
      edgesByGeometry: allEdges,
      metadata: {
        region: 'Bergen/Vestland',
        extractDate: new Date().toISOString(),
        boundingBox: bbox,
      },
    };
  }

  private isRoutable(way: OSMWay): boolean {
    const highway = way.tags.highway;
    if (!highway) return false;

    // Exclude non-routable types
    if (['footway', 'path', 'track', 'stairs'].includes(highway)) {
      return false;
    }

    // Exclude if explicitly marked as no access
    if (way.tags.access === 'private' || way.tags.access === 'no') {
      return false;
    }

    return true;
  }

  private getSpeedLimit(way: OSMWay): number {
    // Check explicit maxspeed tag first
    if (way.tags.maxspeed) {
      const parsed = parseInt(way.tags.maxspeed);
      if (!isNaN(parsed)) return parsed;
    }

    // Fall back to way type
    const highway = way.tags.highway;
    return speedDefaults[highway] || 40;
  }

  private getWayType(way: OSMWay): string {
    return way.tags.highway || 'unclassified';
  }

  private isClosed(way: OSMWay): boolean {
    return (
      way.tags.access === 'no' ||
      way.tags.status === 'closed' ||
      way.tags.abandoned === 'yes'
    );
  }

  private extractRestrictions(
    way: OSMWay
  ): { noUTurn?: boolean; maxWeight?: number; maxHeight?: number; access?: string } {
    const restrictions: any = {};

    if (way.tags.maxweight) {
      restrictions.maxWeight = parseFloat(way.tags.maxweight);
    }

    if (way.tags.maxheight) {
      const match = way.tags.maxheight.match(/[\d.]+/);
      if (match) {
        restrictions.maxHeight = parseFloat(match[0]);
      }
    }

    if (way.tags.access && ['private', 'delivery', 'agricultural'].includes(way.tags.access)) {
      restrictions.access = way.tags.access;
    }

    return Object.keys(restrictions).length > 0 ? restrictions : undefined;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  saveGraph(outputPath: string, graph: ProcessedGraph) {
    const serializable = {
      nodes: graph.nodes,
      edges: graph.edges,
      edgesByGeometry: graph.edgesByGeometry,
      metadata: graph.metadata,
    };

    writeFileSync(outputPath, JSON.stringify(serializable, null, 2));
    console.log(`Graph saved to ${outputPath}`);
  }
}

// Export extraction helper
export async function extractBergenOSM(outputPath: string): Promise<void> {
  const preprocessor = new OSMPreprocessor();

  // Query Overpass API for Bergen/Vestland roads
  const query = `
    [bbox:59.8,4.7,60.5,5.9];
    (
      way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|service"];
    );
    (._; >;);
    out center;
  `;

  console.log('Querying Overpass API for Bergen/Vestland...');
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.statusText}`);
  }

  const osmData = await response.json();
  console.log(
    `Received ${osmData.elements.length} elements from Overpass API`
  );

  const graph = preprocessor.processOverpassResponse(osmData);
  preprocessor.saveGraph(outputPath, graph);

  console.log(
    `Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edge sets`
  );
}
