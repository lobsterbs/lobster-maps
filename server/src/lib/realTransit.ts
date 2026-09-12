/**
 * Real Transit - Entur API (Norwegian National Transit)
 * Covers Bergen/Skyss + all of Norway
 */

const ENTUR_URL = 'https://api.entur.io/journey-planner/v2/trips';

export interface TransitLeg {
  startTime: string;
  endTime: string;
  duration: number;
  mode: 'bus' | 'tram' | 'train' | 'metro' | 'walk';
  line?: string;
  lineName?: string;
  fromStop?: string;
  toStop?: string;
  distance?: number;
}

export interface TransitTrip {
  startTime: string;
  endTime: string;
  duration: number;
  legs: TransitLeg[];
  changes: number; // number of transfers
}

/**
 * Get real public transit directions from Entur
 * Covers all of Norway including Bergen Skyss
 */
export async function getRealTransit(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  departTime?: string
): Promise<TransitTrip[] | null> {
  try {
    const params = new URLSearchParams({
      originCoordinates: `${startLat},${startLng}`,
      destinationCoordinates: `${endLat},${endLng}`,
      dateTime: departTime || new Date().toISOString(),
      limit: '5',
      searchForArrival: 'false',
    });

    const response = await fetch(`${ENTUR_URL}?${params}`, {
      headers: {
        'ET-Client-Name': 'lobster-maps',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Entur error:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data.trips) return [];

    return data.trips.map((trip: any) => ({
      startTime: trip.startTime,
      endTime: trip.endTime,
      duration: Math.round((new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime()) / 1000),
      changes: trip.legs.filter((leg: any) => leg.mode !== 'walk').length - 1,
      legs: trip.legs.map((leg: any) => ({
        startTime: leg.expectedStartTime,
        endTime: leg.expectedEndTime,
        duration: Math.round((new Date(leg.expectedEndTime).getTime() - new Date(leg.expectedStartTime).getTime()) / 1000),
        mode: (leg.mode || 'walk').toLowerCase(),
        line: leg.line?.id,
        lineName: leg.line?.name,
        fromStop: leg.fromPlace?.name,
        toStop: leg.toPlace?.name,
        distance: leg.distance,
      })),
    }));
  } catch (err) {
    console.error('Transit fetch failed:', err);
    return null;
  }
}
