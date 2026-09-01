// Seeds real businesses from OpenStreetMap via the Overpass API.
//
// This is the legitimate path already laid out in README.md, "Where
// to get business data, and where not to": OSM's ODbL license
// explicitly permits this kind of reuse with attribution, unlike
// scraping Yelp/Google Places/TripAdvisor (their ToS prohibit it, and
// Yelp specifically has litigated against scrapers).
//
// Usage:
//   npm run seed:overpass -- --bbox=-74.02,40.70,-73.95,40.78
//   npm run seed:overpass -- --place="Park Slope, Brooklyn"
//
// NOTE ON VERIFICATION: the Overpass query syntax below follows the
// well-established, stable Overpass QL language (not something that's
// shifted recently the way the MapTiler endpoints had), but this
// specific script has not been run end-to-end against the live
// Overpass API from the environment that wrote it — this sandbox's
// network allowlist doesn't reach overpass-api.de. First real run
// should be watched, not assumed clean, same caution as everything
// else tonight that couldn't be self-tested.
//
// Respects Overpass's fair-use policy the same way geocode.ts respects
// Nominatim's: one query per invocation, a real User-Agent, no tight
// retry loops. Both are run by the same OSM Foundation infrastructure,
// same courtesy applies. https://operations.osmfoundation.org/policies/overpass/

import 'dotenv/config';
import { db } from '../db/client.js';
import { businesses } from '../db/schema.js';
import { sql } from 'drizzle-orm';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'LobsterMaps/0.1 (set NOMINATIM_USER_AGENT in .env)';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

type OverpassNode = {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

// Common, well-established OSM amenity values worth importing as
// businesses. Deliberately conservative — amenity covers a lot of
// non-business things too (benches, waste baskets, etc.), this list
// sticks to what's actually a visitable business.
const AMENITY_VALUES = [
  'cafe', 'restaurant', 'bar', 'pub', 'fast_food', 'bank', 'pharmacy',
  'bakery', 'library', 'cinema', 'theatre', 'nightclub', 'ice_cream',
  'bicycle_rental', 'car_rental', 'veterinary', 'dentist', 'clinic',
];

function buildQuery(bbox: [number, number, number, number]): string {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const bboxStr = `${minLat},${minLng},${maxLat},${maxLng}`; // Overpass wants south,west,north,east
  const amenityFilter = AMENITY_VALUES.join('|');
  return `[out:json][timeout:90];
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
  if (!street) return null; // not enough to make a real address, skip rather than guess
  const parts = [houseNumber ? `${houseNumber} ${street}` : street, city].filter(Boolean);
  return parts.join(', ');
}

async function geocodePlace(place: string): Promise<[number, number, number, number]> {
  const url = new URL('/search', NOMINATIM_BASE);
  url.searchParams.set('q', place);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!resp.ok) throw new Error(`Nominatim responded ${resp.status}`);
  const results = (await resp.json()) as Array<{ boundingbox: [string, string, string, string] }>;
  if (results.length === 0) throw new Error(`No geocoding result for "${place}"`);
  const [south, north, west, east] = results[0].boundingbox.map(Number);
  return [west, south, east, north];
}

async function main() {
  const args = process.argv.slice(2);
  const bboxArg = args.find((a) => a.startsWith('--bbox='))?.split('=')[1];
  const placeArg = args.find((a) => a.startsWith('--place='))?.split('=')[1];

  if (!bboxArg && !placeArg) {
    console.error('Usage: npm run seed:overpass -- --bbox=minLng,minLat,maxLng,maxLat');
    console.error('   or: npm run seed:overpass -- --place="Park Slope, Brooklyn"');
    process.exitCode = 1;
    return;
  }

  let bbox: [number, number, number, number];
  if (bboxArg) {
    const parts = bboxArg.split(',').map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) {
      throw new Error('--bbox must be "minLng,minLat,maxLng,maxLat"');
    }
    bbox = parts as [number, number, number, number];
  } else {
    console.log(`Geocoding "${placeArg}" via Nominatim...`);
    bbox = await geocodePlace(placeArg!);
    console.log(`Resolved to bbox: ${bbox.join(',')}`);
  }

  // Rough sanity check — Overpass's fair-use policy asks for restraint,
  // this isn't a hard technical limit, just a guard against someone
  // accidentally passing a whole-country bbox and hammering their
  // infrastructure. ~0.5 degrees is roughly a large metro area.
  const width = bbox[2] - bbox[0];
  const height = bbox[3] - bbox[1];
  if (width > 0.5 || height > 0.5) {
    console.error(
      `Bbox is ${width.toFixed(2)}° x ${height.toFixed(2)}°, that's larger than intended for one query (roughly a large metro area max). Split it into smaller regions — Overpass's public instance is a shared, free resource, not something to hammer with planet-scale queries.`
    );
    process.exitCode = 1;
    return;
  }

  console.log('Querying Overpass...');
  const query = buildQuery(bbox);
  const resp = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'User-Agent': USER_AGENT },
    body: query,
  });
  if (!resp.ok) {
    throw new Error(`Overpass responded ${resp.status}: ${await resp.text()}`);
  }
  const data = (await resp.json()) as { elements: OverpassNode[] };
  console.log(`Overpass returned ${data.elements.length} raw nodes.`);

  let imported = 0;
  let skippedNoName = 0;
  let skippedNoAddress = 0;
  let skippedDuplicate = 0;

  for (const el of data.elements) {
    if (el.type !== 'node' || !el.tags) continue;
    const name = el.tags.name;
    if (!name) {
      skippedNoName++;
      continue;
    }
    const address = buildAddress(el.tags);
    if (!address) {
      skippedNoAddress++;
      continue;
    }

    // Dedup against anything already within ~15m with the same name,
    // case-insensitive — reuses the existing GIST-indexed geog column
    // rather than a slow full-table distance scan.
    const existing = await db.execute(sql`
      SELECT id FROM businesses
      WHERE lower(name) = lower(${name})
        AND geog && ST_Buffer(ST_SetSRID(ST_MakePoint(${el.lon}, ${el.lat}), 4326)::geography, 15)
      LIMIT 1
    `);
    if (existing.rows.length > 0) {
      skippedDuplicate++;
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
      verified: true, // sourced from OSM's own tagged, community-maintained data, distinct from unverified self-submissions
    });
    imported++;
  }

  console.log('\nDone.');
  console.log(`  Imported:            ${imported}`);
  console.log(`  Skipped (no name):   ${skippedNoName}`);
  console.log(`  Skipped (no addr):   ${skippedNoAddress}`);
  console.log(`  Skipped (duplicate): ${skippedDuplicate}`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
