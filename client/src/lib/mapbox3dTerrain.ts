/**
 * Mapbox 3D Terrain with Topographic Colors
 * Not satellite, not black - just pure topographic: green, white, blue
 */

export function enable3DTerrain(map: any) {
  // Add terrain source
  if (!map.getSource('mapbox-dem')) {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
  }

  // Set terrain
  map.setTerrain({
    source: 'mapbox-dem',
    exaggeration: 1.5, // Make mountains taller
  });

  // Add sky layer
  map.addLayer({
    id: 'sky',
    type: 'sky',
    paint: {
      'sky-type': 'gradient',
      'sky-gradient': [
        'interpolate',
        ['linear'],
        ['sky-radial-progress'],
        0.8,
        'rgba(100, 180, 255, 0.8)', // Sky blue
        1,
        'rgba(200, 220, 255, 0.2)', // Light horizon
      ],
      'sky-gradient-center': [0, 0],
      'sky-gradient-radius': 90,
      'sky-opacity': 0.85,
    },
  });
}

export function disable3DTerrain(map: any) {
  map.setTerrain(null);
  if (map.getLayer('sky')) {
    map.removeLayer('sky');
  }
}

/**
 * Set topographic color scheme for terrain
 * Green (low) → Brown (mid) → White (mountains) → Blue (water)
 */
export function set3DTerrainColors(map: any) {
  // Background colors for different elevations
  const bgColor = ['step', ['raster-dem-encoding', 'mapbox'], 
    '#0369a1', // Water
    10, '#0ea5e9', // Shallow
    50, '#22c55e', // Low green
    100, '#16a34a',
    200, '#15803d',
    500, '#a16207',
    1000, '#b45309',
    1500, '#d97706',
    2000, '#9ca3af',
    2500, '#d1d5db',
    3000, '#f5f5f4',
    4000, '#ffffff' // Snow
  ];

  // Apply to background
  map.setPaintProperty('background', 'background-color', bgColor);
}

/**
 * Create topographic-style layer
 * Not realistic, but beautiful and functional
 */
export function addTopographicLayer(map: any) {
  if (!map.getSource('mapbox-dem')) {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
  }

  // Add hillshade layer for visual depth
  map.addLayer({
    id: 'hillshade',
    source: 'mapbox-dem',
    type: 'hillshade',
    layout: { visibility: 'visible' },
    paint: {
      'hillshade-shadow-color': '#000000',
      'hillshade-shadow-intensity': 0.3,
      'hillshade-highlight-color': '#ffffff',
      'hillshade-highlight-intensity': 0.4,
      'hillshade-exaggeration': 0.5,
    },
  }, 'waterway');
}
