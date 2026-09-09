/**
 * Coordinate Validation Utilities
 * Ensure all coordinates are within valid bounds
 */

export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function validateCoordinates(
  lat: number,
  lon: number
): { valid: boolean; error?: string } {
  if (!isValidCoordinate(lat, lon)) {
    return {
      valid: false,
      error: `Invalid coordinates: lat=${lat}, lon=${lon}. Expected: -90 <= lat <= 90, -180 <= lon <= 180`,
    };
  }
  return { valid: true };
}

export function isCoordinateInBounds(
  lat: number,
  lon: number,
  bounds: { north: number; south: number; east: number; west: number }
): boolean {
  return (
    isValidCoordinate(lat, lon) &&
    lat >= bounds.south &&
    lat <= bounds.north &&
    lon >= bounds.west &&
    lon <= bounds.east
  );
}

// Bergen/Vestland bounds (approximate)
export const BERGEN_BOUNDS = {
  north: 60.5,
  south: 60.2,
  east: 5.5,
  west: 4.8,
};

export default {
  isValidCoordinate,
  validateCoordinates,
  isCoordinateInBounds,
  BERGEN_BOUNDS,
};
