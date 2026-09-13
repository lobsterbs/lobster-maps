/**
 * Global Landmark Search
 * Search through landmarks by name or city
 */

interface GlobalLandmark {
  id: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  category: string;
  scale: number;
}

const GLOBAL_LANDMARKS: GlobalLandmark[] = [
  { id: 'eiffel-tower', name: 'Eiffel Tower', city: 'Paris', lat: 48.8584, lon: 2.2945, category: 'landmark', scale: 1 },
  { id: 'big-ben', name: 'Big Ben', city: 'London', lat: 51.4975, lon: -0.1246, category: 'monument', scale: 1.2 },
  { id: 'colosseum', name: 'Colosseum', city: 'Rome', lat: 41.8902, lon: 12.4924, category: 'monument', scale: 1 },
  { id: 'statue-liberty', name: 'Statue of Liberty', city: 'New York', lat: 40.6892, lon: -74.0445, category: 'monument', scale: 0.8 },
  { id: 'taj-mahal', name: 'Taj Mahal', city: 'Agra', lat: 27.1751, lon: 78.0421, category: 'monument', scale: 1.5 },
  { id: 'christ-redeemer', name: 'Christ the Redeemer', city: 'Rio de Janeiro', lat: -22.9519, lon: -43.2105, category: 'monument', scale: 1 },
  { id: 'apple-park', name: 'Apple Park', city: 'Cupertino', lat: 37.3349, lon: -122.0090, category: 'building', scale: 1 },
  { id: 'golden-gate-bridge', name: 'Golden Gate Bridge', city: 'San Francisco', lat: 37.8199, lon: -122.4783, category: 'landmark', scale: 2 },
  { id: 'great-wall', name: 'Great Wall of China', city: 'Beijing', lat: 40.4319, lon: 116.5704, category: 'monument', scale: 1.5 },
  { id: 'burj-khalifa', name: 'Burj Khalifa', city: 'Dubai', lat: 25.1972, lon: 55.2744, category: 'building', scale: 0.8 },
  { id: 'sydney-opera', name: 'Sydney Opera House', city: 'Sydney', lat: -33.8568, lon: 151.2153, category: 'building', scale: 1 },
];

export function searchLandmarks(query: string): GlobalLandmark[] {
  const q = query.toLowerCase();
  return GLOBAL_LANDMARKS.filter(
    (l) =>
      l.name.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q)
  );
}

export function getLandmarksByCity(city: string): GlobalLandmark[] {
  const c = city.toLowerCase();
  return GLOBAL_LANDMARKS.filter((l) => l.city.toLowerCase().includes(c));
}

export { GLOBAL_LANDMARKS };
