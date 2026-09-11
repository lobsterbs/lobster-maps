/**
 * API Helper Functions
 * Wrapper around database queries for the API
 */

import { db } from '../db/client.js';
import { businesses } from '../db/schema.js';
import { and, gte, lte } from 'drizzle-orm';

/**
 * Fetch businesses in a bounding box view
 */
export async function fetchBusinessesInView(bounds: [number, number, number, number]): Promise<any[]> {
  const [minLon, minLat, maxLon, maxLat] = bounds;

  try {
    const results = await db
      .select()
      .from(businesses)
      .where(
        and(
          gte(businesses.longitude, minLon),
          lte(businesses.longitude, maxLon),
          gte(businesses.latitude, minLat),
          lte(businesses.latitude, maxLat)
        )
      )
      .limit(100);

    return results;
  } catch (err) {
    console.error('Fetch businesses error:', err);
    return [];
  }
}

export default { fetchBusinessesInView };
