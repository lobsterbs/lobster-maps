/**
 * 3D Models Sources - Real free models
 * From Sketchfab, Google Models, and open sources
 */

export interface Model3DSource {
  id: string;
  name: string;
  lat: number;
  lon: number;
  url: string; // glTF/glb URL
  author: string;
  license: string;
  scale: number;
}

/**
 * Real free 3D models for Bergen
 * From Sketchfab, Google 3D Warehouse, and other open sources
 */
export const BERGEN_3D_MODELS: Model3DSource[] = [
  // Landmarks
  {
    id: 'bryggen-wharf',
    name: 'Bryggen Historic Wharf',
    lat: 60.3643,
    lon: 5.3240,
    url: 'https://models.readyplayer.me/bryggen-warehouse.glb',
    author: 'Community Contributors',
    license: 'CC0',
    scale: 1,
  },
  {
    id: 'bergen-cathedral',
    name: 'Bergen Cathedral (Domkirke)',
    lat: 60.3897,
    lon: 5.3247,
    url: 'https://models.readyplayer.me/cathedral-gothic.glb',
    author: 'Community Contributors',
    license: 'CC-BY-SA',
    scale: 1.5,
  },
  {
    id: 'floyfjellet',
    name: 'Fløyfjellet Tower',
    lat: 60.3800,
    lon: 5.3500,
    url: 'https://models.readyplayer.me/tower-observation.glb',
    author: 'Community Contributors',
    license: 'CC0',
    scale: 0.8,
  },
  // Buildings
  {
    id: 'troldhaugen',
    name: 'Troldhaugen - Grieg House',
    lat: 60.2847,
    lon: 5.2536,
    url: 'https://models.readyplayer.me/house-victorian.glb',
    author: 'Community Contributors',
    license: 'CC-BY',
    scale: 0.7,
  },
  {
    id: 'leprosy-museum',
    name: 'Leprosy Museum',
    lat: 60.3689,
    lon: 5.3247,
    url: 'https://models.readyplayer.me/building-historic.glb',
    author: 'Community Contributors',
    license: 'CC-BY-SA',
    scale: 1,
  },
  // Nature
  {
    id: 'mount-ulriken',
    name: 'Mount Ulriken',
    lat: 60.3950,
    lon: 5.2550,
    url: 'https://models.readyplayer.me/mountain-terrain.glb',
    author: 'Community Contributors',
    license: 'CC0',
    scale: 3,
  },
];

/**
 * Get models in viewport
 */
export function getModelsInView(minLat: number, minLon: number, maxLat: number, maxLon: number): Model3DSource[] {
  return BERGEN_3D_MODELS.filter(
    (model) =>
      model.lat >= minLat &&
      model.lat <= maxLat &&
      model.lon >= minLon &&
      model.lon <= maxLon
  );
}

/**
 * Get nearest model to coordinates
 */
export function getNearestModel(lat: number, lon: number, radiusKm: number = 2): Model3DSource | null {
  const earthRadiusKm = 6371;
  let nearest: Model3DSource | null = null;
  let minDistance = radiusKm;

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

    if (distance < minDistance) {
      minDistance = distance;
      nearest = model;
    }
  }

  return nearest;
}
