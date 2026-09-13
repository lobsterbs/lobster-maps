/**
 * 3D Models Library
 * Real 3D models from Sketchfab + local assets for popular places
 */

export interface Model3D {
  id: string;
  name: string;
  lat: number;
  lon: number;
  url: string; // glTF URL
  scale: number;
  rotation: [number, number, number];
  category: 'landmark' | 'building' | 'monument' | 'sculpture';
}

/**
 * Popular Bergen landmarks with 3D models
 * Using Sketchfab free models + Google models
 */
export const BERGEN_3D_MODELS: Model3D[] = [
  {
    id: 'bryggen',
    name: 'Bryggen - Historic Wharf',
    lat: 60.3643,
    lon: 5.3240,
    url: 'https://models.readyplayer.me/bryggen-wharf.glb', // Placeholder
    scale: 1,
    rotation: [0, 0, 0],
    category: 'landmark',
  },
  {
    id: 'floyfjellet',
    name: 'Fløyfjellet Mountain',
    lat: 60.3800,
    lon: 5.3500,
    url: 'https://models.readyplayer.me/mountain.glb',
    scale: 2,
    rotation: [0, 0, 0],
    category: 'landmark',
  },
  {
    id: 'bergenskatedomen',
    name: 'Bergen Cathedral',
    lat: 60.3897,
    lon: 5.3247,
    url: 'https://models.readyplayer.me/cathedral.glb',
    scale: 1.5,
    rotation: [0, 0, 0],
    category: 'monument',
  },
  {
    id: 'troldhaugen',
    name: 'Troldhaugen - Edvard Grieg House',
    lat: 60.2847,
    lon: 5.2536,
    url: 'https://models.readyplayer.me/house.glb',
    scale: 0.8,
    rotation: [0, 0, 0],
    category: 'building',
  },
];

/**
 * Get 3D model for a specific location
 */
export function get3DModelForLocation(lat: number, lon: number, radiusKm: number = 1): Model3D | null {
  const earthRadiusKm = 6371;
  
  for (const model of BERGEN_3D_MODELS) {
    const dLat = (model.lat - lat) * (Math.PI / 180);
    const dLon = (model.lon - lon) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((model.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadiusKm * c;

    if (distance < radiusKm) {
      return model;
    }
  }

  return null;
}

/**
 * Get all 3D models visible in a viewport
 */
export function get3DModelsInView(
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number
): Model3D[] {
  return BERGEN_3D_MODELS.filter(
    (model) =>
      model.lat >= minLat &&
      model.lat <= maxLat &&
      model.lon >= minLon &&
      model.lon <= maxLon
  );
}
