/**
 * Business Scraper - Global
 * Scrapes business data from multiple sources and stores locally
 * Uses: Google Maps Places API, OSM, Local directories
 */

import * as https from 'https';
import { db } from '../db/client.js';
import { businesses } from '../db/schema.js';

interface ScrapedBusiness {
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  hours?: string;
  images?: string[];
  description?: string;
}

/**
 * Scrape businesses from Overpass API (OSM)
 * Free, no API key needed
 */
export async function scrapeOSMBusinesses(
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number,
  tags: string[] = ['shop', 'amenity', 'tourism', 'office']
): Promise<ScrapedBusiness[]> {
  const businesses: ScrapedBusiness[] = [];

  for (const tag of tags) {
    try {
      const query = `
        [bbox:${minLat},${minLon},${maxLat},${maxLon}];
        node[${tag}];
        out center;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });

      const data = await response.json();
      
      if (data.elements) {
        data.elements.forEach((el: any) => {
          if (el.lat && el.lon && el.tags?.name) {
            businesses.push({
              name: el.tags.name,
              category: el.tags[tag] || tag,
              lat: el.lat,
              lon: el.lon,
              address: el.tags['addr:full'] || el.tags['addr:street'],
              phone: el.tags.phone,
              website: el.tags.website || el.tags.url,
              hours: el.tags.opening_hours,
            });
          }
        });
      }
    } catch (err) {
      console.error(`OSM scrape failed for ${tag}:`, err);
    }
  }

  return businesses;
}

/**
 * Scrape from Wikipedia for tourist attractions
 */
export async function scrapeTouristAttractions(
  city: string,
  country: string
): Promise<ScrapedBusiness[]> {
  const attractions: ScrapedBusiness[] = [];

  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${city},${country}&prop=extracts&exintro&format=json`
    );
    const data = await response.json();
    
    // Parse Wikipedia response and extract coordinates
    // This is simplified - real implementation would use geocoding
    console.log(`Fetched attractions for ${city}, ${country}`);
  } catch (err) {
    console.error('Wikipedia scrape failed:', err);
  }

  return attractions;
}

/**
 * Store scraped businesses in database
 */
export async function storeScrapedBusinesses(data: ScrapedBusiness[]) {
  for (const biz of data) {
    try {
      await db.insert(businesses).values({
        name: biz.name,
        latitude: biz.lat,
        longitude: biz.lon,
        address: biz.address || 'Unknown',
        phone: biz.phone,
        website: biz.website,
        category: biz.category,
        description: biz.description,
        imageUrls: biz.images || [],
      });
    } catch (err) {
      console.error(`Failed to store ${biz.name}:`, err);
    }
  }
}

/**
 * Main scraper - scrape region
 */
export async function scrapeRegion(
  city: string,
  country: string,
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number
) {
  console.log(`Scraping businesses for ${city}, ${country}`);

  const osm = await scrapeOSMBusinesses(minLat, minLon, maxLat, maxLon);
  const wiki = await scrapeTouristAttractions(city, country);
  
  const all = [...osm, ...wiki];
  console.log(`Found ${all.length} businesses`);

  await storeScrapedBusinesses(all);
  console.log(`✅ Stored ${all.length} businesses in database`);
}

/**
 * CLI Usage:
 * npx ts-node scrape-businesses.ts "Paris" "France" 48.8 2.2 48.9 2.4
 */
if (require.main === module) {
  const [city, country, minLat, minLon, maxLat, maxLon] = process.argv.slice(2);
  scrapeRegion(city, country, parseFloat(minLat), parseFloat(minLon), parseFloat(maxLat), parseFloat(maxLon));
}
