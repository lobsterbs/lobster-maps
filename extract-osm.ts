#!/usr/bin/env tsx
/**
 * Extract Bergen/Vestland road network from OSM and build routing graph
 * Usage: npm run extract:osm
 *
 * Output: data/bergen-routing-graph.json (~80MB)
 * Time: ~30 minutes (depends on OSM server load)
 */

import { extractBergenOSM } from './osmPreprocessor';
import { mkdir } from 'fs/promises';
import { join } from 'path';

async function main() {
  const dataDir = join(process.cwd(), 'data');

  try {
    // Create data directory if it doesn't exist
    await mkdir(dataDir, { recursive: true });

    const outputPath = join(dataDir, 'bergen-routing-graph.json');

    console.log('Starting OSM extraction for Bergen/Vestland...');
    console.log('This may take several minutes.');
    console.log('');

    const startTime = Date.now();
    await extractBergenOSM(outputPath);
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('');
    console.log(`✓ Graph extraction complete in ${elapsed}m`);
    console.log(`✓ Graph saved to: ${outputPath}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Restart server (npm run dev)');
    console.log('  2. Routing engine will load the graph automatically');
    console.log('  3. Test with: curl -X POST http://localhost:3000/api/route');
  } catch (err) {
    console.error('OSM extraction failed:', err);
    process.exit(1);
  }
}

main();
