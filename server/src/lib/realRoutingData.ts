/**
 * Real Routing Data Source - OpenRouteService
 * Uses ORS to get real road data, feeds into our A* engine
 */

const ORS_API = 'https://api.openrouteservice.org/v2/directions/driving';
const ORS_KEY = process.env.ORS_API_KEY || '';

export interface RoadSegment {
  distance: number;
  duration: number;
  lat: number;
  lng: number;
  nextLat?: number;
  nextLng?: number;
  instruction?: string;
}

/**
 * Fetch real road data from OpenRouteService
 * Returns polyline + instructions to feed into our routing engine
 */
export async function getRealRoadData(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<{ polyline: Array<[number, number]>; instructions: string[] } | null> {
  if (!ORS_KEY) {
    console.warn('⚠️ ORS_API_KEY not set - custom routing only');
    return null;
  }

  try {
    const response = await fetch(ORS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ORS_KEY,
      },
      body: JSON.stringify({
        coordinates: [[startLng, startLat], [endLng, endLat]],
        format: 'geojson',
        instructions: true,
        geometry: true,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
    const instructions = route.segments
      .flatMap((seg: any) => seg.steps.map((s: any) => s.instruction || 'Continue'))
      .filter(Boolean);

    return { polyline: coords, instructions };
  } catch (err) {
    console.error('ORS fetch failed:', err);
    return null;
  }
}

/**
 * Get routing stats from ORS for our engine to use
 */
export async function getRoutingStats(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<{ distance: number; duration: number } | null> {
  if (!ORS_KEY) return null;

  try {
    const response = await fetch(ORS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ORS_KEY,
      },
      body: JSON.stringify({
        coordinates: [[startLng, startLat], [endLng, endLat]],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) return null;

    return {
      distance: route.summary.distance,
      duration: route.summary.duration,
    };
  } catch (err) {
    return null;
  }
}
