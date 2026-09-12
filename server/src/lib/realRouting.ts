/**
 * Real Routing - OpenRouteService
 * Proper turn-by-turn directions with real data
 */

const ORS_API = 'https://api.openrouteservice.org/v2/directions/driving';
const ORS_KEY = process.env.ORS_API_KEY || '';

export interface RouteStep {
  distance: number;
  duration: number;
  instruction: string;
  maneuver?: string;
}

export interface Route {
  distance: number; // meters
  duration: number; // seconds
  steps: RouteStep[];
  polyline: Array<[number, number]>;
}

/**
 * Get real directions from OpenRouteService
 */
export async function getRealRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<Route | null> {
  if (!ORS_KEY) {
    console.warn('⚠️ ORS_API_KEY not set - using fallback route');
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
        radiuses: [5, 5],
        format: 'json',
        geometry: true,
        steps: true,
        instructions: true,
      }),
    });

    if (!response.ok) {
      console.error('ORS error:', response.status);
      return null;
    }

    const data = await response.json();
    const route = data.routes[0];

    return {
      distance: route.summary.distance,
      duration: route.summary.duration,
      polyline: route.geometry,
      steps: route.segments.flatMap((seg: any) =>
        seg.steps.map((step: any) => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.instruction || 'Continue',
          maneuver: step.maneuver?.type || 'straight',
        }))
      ),
    };
  } catch (err) {
    console.error('Route fetch failed:', err);
    return null;
  }
}
