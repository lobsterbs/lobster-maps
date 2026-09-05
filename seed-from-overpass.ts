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
// The actual import logic lives in ../lib/overpassImport.ts, shared
// with the live merge-on-view logic in routes/businesses.ts — this
// script is now just the CLI wrapper (bbox/place resolution, sanity
// checks, argument parsing) around that shared core.
//
// NOTE ON VERIFICATION: the Overpass query syntax follows the
// well-established, stable Overpass QL language, but this has not
// been run end-to-end against the live Overpass API from the
// environment that wrote it — this sandbox's network allowlist
// doesn't reach overpass-api.de. First real run should be watched.
//
// Respects Overpass's fair-use policy the same way geocode.ts respects
// Nominatim's: a real User-Agent, no tight retry loops. Both are run
// by the same OSM Foundation infrastructure, same courtesy applies.
// https://operations.osmfoundation.org/policies/overpass/

import 'dotenv/config';
import { importBusinessesFromOverpass } from '../lib/overpassImport.js';

const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'LobsterMaps/0.1 (set NOMINATIM_USER_AGENT in .env)';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

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
  const result = await importBusinessesFromOverpass(bbox, USER_AGENT, 90);

  console.log('\nDone.');
  console.log(`  Imported:            ${result.imported}`);
  console.log(`  Skipped (no name):   ${result.skippedNoName}`);
  console.log(`  Skipped (no addr):   ${result.skippedNoAddress}`);
  console.log(`  Skipped (duplicate): ${result.skippedDuplicate}`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
