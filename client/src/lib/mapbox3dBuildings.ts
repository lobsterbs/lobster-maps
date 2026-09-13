/**
 * Mapbox 3D Buildings Layer
 * Real building extrusions with proper texturing
 */

export function enable3DBuildings(map: any) {
  // Check if buildings layer already exists
  if (map.getLayer('3d-buildings')) return;

  // Add 3D buildings layer
  map.addLayer(
    {
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'height'], 0, '#a1a1a1', 100, '#d1d1d1', 300, '#f5f5f4'],
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
        'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
        'fill-extrusion-opacity': 0.85,
      },
    },
    'waterway-label'
  );
}

export function disable3DBuildings(map: any) {
  if (map.getLayer('3d-buildings')) {
    map.removeLayer('3d-buildings');
  }
}

export function set3DBuildingsColor(map: any, scheme: 'satellite' | 'topographic' | 'dark') {
  if (!map.getLayer('3d-buildings')) return;

  const colors = {
    satellite: {
      color: ['interpolate', ['linear'], ['get', 'height'], 0, '#c0c0c0', 100, '#d9d9d9', 300, '#f0f0f0'],
      opacity: 0.8,
    },
    topographic: {
      color: ['interpolate', ['linear'], ['get', 'height'], 0, '#9ca3af', 50, '#a8a9ad', 100, '#b0b1b5', 200, '#c8c9cd', 500, '#e0e0e0'],
      opacity: 0.75,
    },
    dark: {
      color: ['interpolate', ['linear'], ['get', 'height'], 0, '#4b5563', 100, '#6b7280', 300, '#9ca3af'],
      opacity: 0.9,
    },
  };

  const scheme_colors = colors[scheme];
  map.setPaintProperty('3d-buildings', 'fill-extrusion-color', scheme_colors.color);
  map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', scheme_colors.opacity);
}
