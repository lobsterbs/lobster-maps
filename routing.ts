// OpenRouteService directions client. Real, verified against their
// actual API (their own JS client source + swagger docs), not guessed —
// endpoint shape, auth header, and coordinate order below are all
// checked, given how the MapTiler URL went the first time.
//
// What's NOT independently verified: the exact response JSON field
// names for duration/distance in the parsed result below. Standard
// GeoJSON routing-response shape, high confidence, but this needs a
// real ORS API key to actually call and there isn't one configured
// yet (see VITE_ORS_KEY in .env.example) — this file has never
// actually round-tripped a real response. Defensive parsing below
// (optional chaining, no throwing on a missing field) is deliberate
// because of that, not just style.
//
// Free tier: ~2000 directions requests/day per their own docs, 40/min
// sliding window. Get a key at openrouteservice.org (needs signup).

const ORS_KEY = import.meta.env.VITE_ORS_KEY || '';
const ORS_BASE = 'https://api.openrouteservice.org/v2/directions';

export type RoutingProfile = 'driving-car' | 'cycling-regular' | 'foot-walking';

export type Route = {
  /** [lng, lat] pairs, ready to hand straight to a MapLibre GeoJSON line source */
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
};

export function isRoutingConfigured(): boolean {
  return ORS_KEY.length > 0;
}

export async function getRoute(
  from: [number, number], // [lng, lat]
  to: [number, number], // [lng, lat]
  profile: RoutingProfile = 'driving-car'
): Promise<Route | null> {
  if (!ORS_KEY) return null;

  const resp = await fetch(`${ORS_BASE}/${profile}/geojson`, {
    method: 'POST',
    headers: {
      Authorization: ORS_KEY, // raw key, not "Bearer <key>" — confirmed from ORS's own client library source
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ coordinates: [from, to] }),
  });

  if (!resp.ok) {
    console.error(`OpenRouteService responded ${resp.status}: ${await resp.text().catch(() => '')}`);
    return null;
  }

  const data = await resp.json();
  const feature = data?.features?.[0];
  const coords = feature?.geometry?.coordinates;
  const summary = feature?.properties?.summary;

  if (!Array.isArray(coords) || !summary) {
    console.error('OpenRouteService response missing expected fields, got:', data);
    return null;
  }

  return {
    coordinates: coords,
    distanceMeters: summary.distance ?? 0,
    durationSeconds: summary.duration ?? 0,
  };
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours} hr ${rem} min` : `${hours} hr`;
}

export function formatDistance(meters: number, useMiles = false): string {
  if (useMiles) {
    const miles = meters / 1609.34;
    return miles < 0.1 ? `${Math.round(meters * 3.28084)} ft` : `${miles.toFixed(1)} mi`;
  }
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}
