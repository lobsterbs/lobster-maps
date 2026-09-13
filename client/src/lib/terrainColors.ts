/**
 * Terrain Colors - Topographic style
 * Green for low elevations, white for mountains, blue for water
 */

export interface TerrainColor {
  elevation: number; // meters
  color: string; // hex
}

export const TERRAIN_COLORS: TerrainColor[] = [
  // Water
  { elevation: -1000, color: '#0369a1' }, // Deep water
  { elevation: -100, color: '#0ea5e9' },  // Water
  { elevation: 0, color: '#06b6d4' },     // Coastal

  // Low elevations - Green
  { elevation: 10, color: '#22c55e' },    // Very low green
  { elevation: 100, color: '#16a34a' },   // Low green
  { elevation: 200, color: '#15803d' },   // Medium green

  // Mid elevations - Brown/Gold
  { elevation: 500, color: '#a16207' },   // Lower foothills
  { elevation: 1000, color: '#b45309' },  // Foothills
  { elevation: 1500, color: '#d97706' },  // Upper foothills

  // High elevations - Gray/White
  { elevation: 2000, color: '#9ca3af' },  // Gray
  { elevation: 2500, color: '#d1d5db' },  // Light gray
  { elevation: 3000, color: '#f5f5f4' },  // Nearly white
  { elevation: 4000, color: '#ffffff' },  // White (snow)
];

/**
 * Get color for elevation
 */
export function getTerrainColor(elevation: number): string {
  for (let i = TERRAIN_COLORS.length - 1; i >= 0; i--) {
    if (elevation >= TERRAIN_COLORS[i].elevation) {
      return TERRAIN_COLORS[i].color;
    }
  }
  return TERRAIN_COLORS[0].color;
}

/**
 * Create Mapbox terrain fill expression
 */
export function createTerrainExpression(): any {
  const expr: any[] = ['case'];
  
  // Add water check
  expr.push(['has', 'water']);
  expr.push(0x0369a1);
  
  // Add elevation-based colors
  for (let i = 0; i < TERRAIN_COLORS.length - 1; i++) {
    expr.push(['>=', ['get', 'elevation'], TERRAIN_COLORS[i].elevation]);
    expr.push(TERRAIN_COLORS[i].color);
  }
  
  expr.push(TERRAIN_COLORS[0].color); // Default
  
  return expr;
}
