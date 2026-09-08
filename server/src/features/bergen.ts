/**
 * Bergen & Vestland specific features
 * - Toll roads (E6, E39, E18)
 * - Speed cameras
 * - Bike lanes (Bysykkelringen)
 * - Park & ride stations
 * - Weather delays (fjord microclimates)
 */

export interface TollRoad {
  id: string;
  name: string;
  code: string; // E6, E39, etc
  bbox: [number, number, number, number]; // [minLat, minLng, maxLat, maxLng]
  toll_class: 'A' | 'B' | 'C'; // Motorcycle, Car, Heavy vehicle
  cost_nok: Record<string, number>; // "A" -> 35 NOK
}

export interface SpeedCamera {
  id: string;
  location: [number, number]; // [lat, lng]
  road_name: string;
  speed_limit: number; // km/h
  direction: 'north' | 'south' | 'east' | 'west' | 'both';
  active: boolean;
}

export interface BikeRoute {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  distance_km: number;
  elevation_m: number;
  polyline: string;
}

export interface ParkAndRide {
  id: string;
  name: string;
  location: [number, number];
  capacity: number;
  occupied: number;
  transit_lines: string[]; // Bus/tram lines served
}

export class BergenFeatures {
  /**
   * Check if route passes through toll road
   */
  async checkTollRoads(polyline: [number, number][]): Promise<TollRoad[]> {
    // Query: SELECT * FROM toll_roads WHERE ST_Intersects(...)
    return [];
  }

  /**
   * Find speed cameras near route (500m radius)
   */
  async getNearbySpeedCameras(lat: number, lng: number, radius_m: number = 500): Promise<SpeedCamera[]> {
    // SELECT * FROM speed_cameras WHERE ST_DWithin(...)
    return [];
  }

  /**
   * Find scenic bike routes
   */
  async getBikeRoutes(
    lat: number,
    lng: number,
    radius_km: number = 15,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): Promise<BikeRoute[]> {
    // SELECT * FROM bike_routes WHERE difficulty = $1
    return [];
  }

  /**
   * Find park & ride with availability
   */
  async getParkAndRideOptions(lat: number, lng: number, radius_km: number = 5): Promise<ParkAndRide[]> {
    // SELECT * FROM park_and_ride WHERE capacity > occupied
    return [];
  }

  /**
   * Weather-aware routing (fjord microclimates)
   */
  async getWeatherDelays(polyline_coords: [number, number][]): Promise<Map<string, number>> {
    return new Map();
  }
}

// Pre-populated Bergen data
export const TOLL_ROADS: TollRoad[] = [
  {
    id: 'e6_oslo_trondheim',
    name: 'E6 Oslo - Trondheim',
    code: 'E6',
    bbox: [59.9, 10.6, 60.8, 10.8],
    toll_class: 'A',
    cost_nok: { A: 35, B: 100, C: 200 },
  },
  {
    id: 'e39_stavanger_oslo',
    name: 'E39 Stavanger - Oslo',
    code: 'E39',
    bbox: [58.9, 5.6, 59.9, 6.0],
    toll_class: 'B',
    cost_nok: { A: 50, B: 150, C: 300 },
  },
];

export const SPEED_CAMERAS: SpeedCamera[] = [
  {
    id: 'sc_001',
    location: [60.3893, 5.3196],
    road_name: 'E39 Bergen outbound',
    speed_limit: 80,
    direction: 'south',
    active: true,
  },
];

export const BIKE_ROUTES: BikeRoute[] = [
  {
    id: 'bike_001',
    name: 'Bysykkelringen Bergen Loop',
    difficulty: 'easy',
    distance_km: 12,
    elevation_m: 150,
    polyline: '',
  },
];

export const PARK_AND_RIDE: ParkAndRide[] = [
  {
    id: 'par_001',
    name: 'Tertnes P&R',
    location: [60.3450, 5.3200],
    capacity: 500,
    occupied: 320,
    transit_lines: ['1', '4', '5', '6'],
  },
];
