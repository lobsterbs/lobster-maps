// Shared core of the Overpass business import — used by both the
// standalone CLI script (server/src/scripts/seed-from-overpass.ts) and
// the live merge-on-view logic in routes/businesses.ts. Same OSM/
// Overpass legitimacy reasoning as documented in that script's header
// and README.md's "Where to get business data, and where not to".

import { db } from '../db/client.js';
import { businesses } from '../db/schema.js';
import { sql } from 'drizzle-orm';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

type OverpassNode = {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

const AMENITY_VALUES = [
  'cafe', 'restaurant', 'bar', 'pub', 'fast_food', 'bank', 'pharmacy',
  'bakery', 'library', 'cinema', 'theatre', 'nightclub', 'ice_cream',
  'bicycle_rental', 'car_rental', 'veterinary', 'dentist', 'clinic',
];

function buildQuery(bbox: [number, number, number, number], timeoutSeconds: number): string {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const bboxStr = `${minLat},${minLng},${maxLat},${maxLng}`; // Overpass wants south,west,north,east
  const amenityFilter = AMENITY_VALUES.join('|');
  return `[out:json][timeout:${timeoutSeconds}];
(
  node["shop"](${bboxStr});
  node["amenity"~"^(${amenityFilter})$"](${bboxStr});
  node["office"](${bboxStr});
);
out body;`;
}

function humanizeCategory(tags: Record<string, string>): string {
  const raw = tags.shop || tags.amenity || tags.office || 'business';
  return raw
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildAddress(tags: Record<string, string>): string | null {
  const street = tags['addr:street'];
  const houseNumber = tags['addr:housenumber'];
  const city = tags['addr:city'];
  if (!street) return null;
  const parts = [houseNumber ? `${houseNumber} ${street}` : street, city].filter(Boolean);
  return parts.join(', ');
}

export type ImportResult = {
  imported: number;
  skippedNoName: number;
  skippedNoAddress: number;
  skippedDuplicate: number;
};

export async function importBusinessesFromOverpass(
  bbox: [number, number, number, number],
  userAgent: string,
  timeoutSeconds = 90
): Promise<ImportResult> {
  const query = buildQuery(bbox, timeoutSeconds);
  const resp = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'User-Agent': userAgent },
    body: query,
  });
  if (!resp.ok) {
    throw new Error(`Overpass responded ${resp.status}: ${await resp.text()}`);
  }
  const data = (await resp.json()) as { elements: OverpassNode[] };

  const result: ImportResult = { imported: 0, skippedNoName: 0, skippedNoAddress: 0, skippedDuplicate: 0 };

  for (const el of data.elements) {
    if (el.type !== 'node' || !el.tags) continue;
    const name = el.tags.name;
    if (!name) {
      result.skippedNoName++;
      continue;
    }
    const address = buildAddress(el.tags);
    if (!address) {
      result.skippedNoAddress++;
      continue;
    }

    const existing = await db.execute(sql`
      SELECT id FROM businesses
      WHERE lower(name) = lower(${name})
        AND geog && ST_Buffer(ST_SetSRID(ST_MakePoint(${el.lon}, ${el.lat}), 4326)::geography, 15)
      LIMIT 1
    `);
    if (existing.rows.length > 0) {
      result.skippedDuplicate++;
      continue;
    }

    await db.insert(businesses).values({
      name,
      category: humanizeCategory(el.tags),
      address,
      latitude: el.lat,
      longitude: el.lon,
      phone: el.tags.phone || el.tags['contact:phone'] || undefined,
      website: el.tags.website || el.tags['contact:website'] || undefined,
      verified: true,
    });
    result.imported++;
  }

  return result;
}
