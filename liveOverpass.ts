// Live-merge: when a bbox is requested that hasn't been recently
// covered, kicks off a viewport-scoped Overpass import (reusing the
// exact same tested logic as the standalone seed script) so
// OSM-sourced businesses just show up as areas get viewed, not only
// after someone manually runs the seed script.
//
// Cached by a coarse grid cell (not the raw bbox) so panning around
// the same neighborhood doesn't trigger a fresh Overpass call on
// every single map move — checked against the CENTER of the requested
// viewport, not every cell it touches. Simpler than full per-cell
// coverage tracking, doesn't perfectly dedupe a viewport straddling a
// cell boundary, but covers the actual practical concern (repeated
// pans/refreshes over roughly the same area) without adding real
// complexity for a marginal improvement.

import { db } from '../db/client.js';
import { overpassQueryCache } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import { importBusinessesFromOverpass } from './overpassImport.js';

const GRID_SIZE = 0.05; // degrees, roughly 5-6km cells depending on latitude
const COOLDOWN_HOURS = 24 * 7; // one week — OSM data doesn't change fast enough to justify re-querying more often
const MAX_VIEWPORT_DEGREES = 0.3; // guard against a very zoomed-out view triggering an enormous live query

function cellFor(lng: number, lat: number): [number, number] {
  return [Math.floor(lng / GRID_SIZE), Math.floor(lat / GRID_SIZE)];
}

export async function liveMergeOverpass(
  bbox: [number, number, number, number],
  userAgent: string
): Promise<void> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const width = maxLng - minLng;
  const height = maxLat - minLat;

  // Zoomed-out views (browsing a whole country/continent) aren't a
  // good fit for a live viewport query — too large, too slow, and not
  // really what this feature is for (that's what the batch seed script
  // is for). Skip silently, DB-only results for those, same as before
  // this feature existed.
  if (width > MAX_VIEWPORT_DEGREES || height > MAX_VIEWPORT_DEGREES) return;

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const [col, row] = cellFor(centerLng, centerLat);

  const cached = await db
    .select()
    .from(overpassQueryCache)
    .where(sql`${overpassQueryCache.cellCol} = ${col} AND ${overpassQueryCache.cellRow} = ${row}`)
    .limit(1);

  if (cached.length > 0) {
    const ageHours = (Date.now() - new Date(cached[0].queriedAt).getTime()) / 3_600_000;
    if (ageHours < COOLDOWN_HOURS) return; // recently covered, skip the live call
  }

  try {
    await importBusinessesFromOverpass(bbox, userAgent, 20); // short timeout — this runs inline in a request, not a background job
  } catch (err) {
    // Never let a live Overpass hiccup break the business listing
    // response — worst case, the viewport just doesn't get freshly
    // merged this time, existing DB rows still return fine.
    console.error('Live Overpass merge failed (non-fatal, DB results still returned):', err);
    return; // don't mark the cell as covered if the query itself failed
  }

  await db
    .insert(overpassQueryCache)
    .values({ cellCol: col, cellRow: row })
    .onConflictDoUpdate({
      target: [overpassQueryCache.cellCol, overpassQueryCache.cellRow],
      set: { queriedAt: sql`now()` },
    });
}
