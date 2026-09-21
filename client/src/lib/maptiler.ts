/**
 * MapTiler Cloud configuration.
 *
 * Every identifier and URL shape in this file was checked against a
 * primary source, not pattern-matched from a tutorial:
 *
 *  - Style endpoint `GET /maps/{mapId}/style.json`
 *    docs.maptiler.com/cloud/api/maps/
 *  - Style IDs and their dark/light/night variants: read out of
 *    MapTiler's own published client (`@maptiler/client`, MAP_STYLE_CONFIG).
 *    That table also marks every `*-v2` style deprecated in favour of
 *    `*-v4`, which is why nothing here references v2.
 *  - Terrain DEM tileset `terrain-rgb-v2`, raster-dem, max zoom 14
 *    docs.maptiler.com/schema-raster/terrain-rgb/ and the
 *    `tiles/terrain-rgb-v2/tiles.json` string inside @maptiler/sdk.
 *  - Planet v4 vector schema (building / road / poi_* layer names)
 *    docs.maptiler.com/schema/planet-v4/
 *
 * The key is read at BUILD time by Vite (VITE_ prefix), so it is baked
 * into the client bundle and the browser talks to MapTiler's CDN
 * directly. That is deliberate and is how MapTiler expects their web
 * keys to be used: protect the key with an origin restriction in the
 * MapTiler dashboard (Account -> API Keys -> Edit -> allowed origins),
 * not by hiding it behind our own server. Proxying tiles through Render
 * would put a US box in the middle of every tile request from Norway
 * and burn our bandwidth for no security we don't already get from the
 * origin restriction.
 */

export const MAPTILER_KEY: string = import.meta.env.VITE_MAPTILER_KEY || '';

export const hasMapTiler = MAPTILER_KEY.length > 0;

export const MAPTILER_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">&copy; MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">&copy; OpenStreetMap contributors</a>';

/**
 * Style JSON URL for a MapTiler map id.
 * Uses server proxy to avoid browser Origin header issues with MapTiler.
 * If the server proxy is available, uses that; otherwise falls back to direct.
 */
export function styleUrl(mapId: string): string {
  // Use server proxy if available (no key needed, server has it)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `/api/maptiler/style/${mapId}`;
  }
  // Fallback to direct MapTiler for localhost dev
  return `https://api.maptiler.com/maps/${mapId}/style.json?key=${MAPTILER_KEY}`;
}

/**
 * TileJSON URL for a MapTiler tileset id.
 * Uses server proxy to avoid browser Origin header issues.
 */
export function tilesUrl(tilesId: string): string {
  // Use server proxy if available
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `/api/maptiler/tiles/${tilesId}`;
  }
  // Fallback to direct MapTiler for localhost dev
  return `https://api.maptiler.com/tiles/${tilesId}/tiles.json?key=${MAPTILER_KEY}`;
}

/**
 * Terrain RGB DEM. `encoding` is left at MapLibre's default ("mapbox"),
 * which is the encoding MapTiler's Terrain RGB actually uses — see the
 * raster-dem section of docs.maptiler.com/gl-style-specification/sources/.
 * maxzoom 14 is the dataset's real ceiling; MapLibre overzooms past it.
 */
export const TERRAIN_SOURCE_ID = 'maptiler-terrain';
export const TERRAIN_TILEJSON = () => tilesUrl('terrain-rgb-v2');
export const TERRAIN_MAX_ZOOM = 14;

export type BasemapId =
  | 'streets-v4-dark'
  | 'streets-v4'
  | 'outdoor-v4-dark'
  | 'topo-v4'
  | 'hybrid-v4'
  | 'winter-v4'
  | 'ocean-v4';

export type Basemap = {
  id: BasemapId;
  /** Shown in the switcher. */
  label: string;
  /** One line explaining when this one is the right pick. */
  hint: string;
  /** Dark-surfaced style — drives marker/route contrast colours. */
  dark: boolean;
  /** Imagery-backed style — pitch and building tint differ. */
  imagery: boolean;
};

/**
 * Curated for Bergen rather than dumping all 14 MapTiler styles into a
 * switcher nobody reads. Bergen is a coastal city ringed by seven
 * mountains, so terrain, topo and ocean styles genuinely earn their
 * slot here in a way they would not for a flat inland city.
 */
export const BASEMAPS: Basemap[] = [
  {
    id: 'streets-v4-dark',
    label: 'Dark',
    hint: 'Default. Dark street map, matches the app surface.',
    dark: true,
    imagery: false,
  },
  {
    id: 'streets-v4',
    label: 'Light',
    hint: 'Standard daytime street map.',
    dark: false,
    imagery: false,
  },
  {
    id: 'outdoor-v4-dark',
    label: 'Outdoor',
    hint: 'Trails, contours and paths for the seven mountains.',
    dark: true,
    imagery: false,
  },
  {
    id: 'topo-v4',
    label: 'Topo',
    hint: 'Topographic relief and elevation contours.',
    dark: false,
    imagery: false,
  },
  {
    id: 'hybrid-v4',
    label: 'Satellite',
    hint: 'Aerial imagery with street and place labels on top.',
    dark: true,
    imagery: true,
  },
  {
    id: 'winter-v4',
    label: 'Winter',
    hint: 'Ski and winter-season cartography.',
    dark: false,
    imagery: false,
  },
  {
    id: 'ocean-v4',
    label: 'Ocean',
    hint: 'Bathymetry for the fjord and coastline.',
    dark: false,
    imagery: false,
  },
];

export const DEFAULT_BASEMAP: BasemapId = 'streets-v4-dark';

export function getBasemap(id: BasemapId): Basemap {
  return BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];
}

/**
 * Keyless fallback. Raster OSM through our own backend proxy, so the
 * app still shows a map when VITE_MAPTILER_KEY was not set at build
 * time instead of rendering a black rectangle. Deliberately ugly: it
 * should be obvious that the key is missing.
 */
export const OSM_PROXY_TILES = '/api/tiles/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">&copy; OpenStreetMap contributors</a>';
