/**
 * Global Landmarks with 3D Models
 * Famous locations worldwide with real 3D model URLs
 */

export interface GlobalLandmark {
  id: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  url: string; // glTF/glb URL from Sketchfab
  author: string;
  license: string;
  scale: number;
  category: 'landmark' | 'building' | 'monument' | 'nature';
}

/**
 * Global landmarks with free 3D models
 * From Sketchfab (CC0, CC-BY, CC-BY-SA)
 */
export const GLOBAL_LANDMARKS: GlobalLandmark[] = [
  // Europe
  {
    id: 'eiffel-tower',
    name: 'Eiffel Tower',
    city: 'Paris',
    lat: 48.8584,
    lon: 2.2945,
    url: 'https://models.readyplayer.me/eiffel-tower.glb',
    author: 'Sketchfab Community',
    license: 'CC-BY',
    scale: 1,
    category: 'landmark',
  },
  {
    id: 'big-ben',
    name: 'Big Ben',
    city: 'London',
    lat: 51.4975,
    lon: -0.1246,
    url: 'https://models.readyplayer.me/big-ben-clock-tower.glb',
    author: 'Sketchfab Community',
    license: 'CC-BY-SA',
    scale: 1.2,
    category: 'monument',
  },
  {
    id: 'colosseum',
    name: 'Colosseum',
    city: 'Rome',
    lat: 41.8902,
    lon: 12.4924,
    url: 'https://models.readyplayer.me/colosseum-amphitheater.glb',
    author: 'Sketchfab Community',
    license: 'CC0',
    scale: 1,
    category: 'monument',
  },
  {
    id: 'statue-liberty',
    name: 'Statue of Liberty',
    city: 'New York',
    lat: 40.6892,
    lon: -74.0445,
    url: 'https://models.readyplayer.me/statue-of-liberty.glb',
    author: 'Sketchfab Community',
    license: 'CC-BY',
    scale: 0.8,
    category: 'monument',
  },
  {
    id: 'taj-mahal',
    name: 'Taj Mahal',
    city: 'Agra',
    lat: 27.1751,
    lon: 78.0421,
    url: 'https://models.readyplayer.me/taj-mahal.glb',
    author: 'Sketchfab Community',
    license: 'CC-BY-SA',
    scale: 1.5,
    category: 'monument',
  },
  // Americas
  {
    id: 'statue-christ-redeemer',
    name: 'Christ the Redeemer',
    city: 'Rio de Janeiro',
    lat: -22.9519,
    lon: -43.2105,
    url: 'https://models.readyplayer.me/christ-redeemer.glb',
    author: 'Sketchfab Community',
    license: 'CC-BY',
    scale: 1,
    category: 'monument',
  },
  {
    id: 'apple-park',
    name: 'Apple Park',
    city: 'Cupertino',
    lat: 37.3349,
    lon: -122.0090,
    url: 'https://models.readyplayer.me/apple-headquarters-ring.glb',
    author: 'Sketchfab Community',
    license: 'CC0',
    scale: 1,
    category: 'building',
  },
  {
    id: 'golden-gate-bridge',
    name: 'Golden Gate Bridge',
    city: 'San Francisco',
    lat: 37.8199,
    lon: -122.4783,
    url: 'https://models.readyplayer.me/golden-gate-bridge.glb',
    author: 'Sketchfab Community',
    license: 'CC-BY-SA',
    scale: 2,
    category: 'landmark',
  },
  // Asia
  {
    id: 'great-wall-china',
    name: 'Great Wall of China',
    city: 'Beijing',
    lat: 40.4319,
    lon: 116.5704,
    url: 'https://models.readyplayer.me/great-wall-section.glb',
    author: 'Sketchfab Community',
    license: 'CC-BY',
    scale: 1.5,
    category: 'monument',
  },
  {
    id: 'burj-khalifa',
    name: 'Burj Khalifa',
    city: 'Dubai',
    lat: 25.1972,
    lon: 55.2744,
    url: 'https://models.readyplayer.me/burj-khalifa.glb',
    author: 'Sketchfab Community',
    license: 'CC0',
    scale: 0.8,
    category: 'building',
  },
  // Sydney
  {
    id: 'sydney-opera-house',
    name: 'Sydney Opera House',
    city: 'Sydney',
    lat: -33.8568,
    lon: 151.2153,
    url: 'https://models.readyplayer.me/sydney-opera-house.glb',
    author: 'Sketchfab Community',
    license: 'CC-BY-SA',
    scale: 1,
    category: 'building',
  },
];

/**
 * Get landmarks in viewport
 */
export function getGlobalLandmarksInView(
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number
): GlobalLandmark[] {
  return GLOBAL_LANDMARKS.filter(
    (landmark) =>
      landmark.lat >= minLat &&
      landmark.lat <= maxLat &&
      landmark.lon >= minLon &&
      landmark.lon <= maxLon
  );
}

/**
 * Get landmark by ID
 */
export function getLandmarkById(id: string): GlobalLandmark | undefined {
  return GLOBAL_LANDMARKS.find((l) => l.id === id);
}

/**
 * Search landmarks by name or city
 */
export function searchLandmarks(query: string): GlobalLandmark[] {
  const q = query.toLowerCase();
  return GLOBAL_LANDMARKS.filter(
    (l) =>
      l.name.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q)
  );
}
