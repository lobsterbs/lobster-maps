import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import * as maplibregl from 'maplibre-gl';
import { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { Map as MapIcon, Satellite } from 'lucide-react';
import { animated, useSpring } from '@react-spring/web';
import VersionIndicator from './VersionIndicator';
import 'maplibre-gl/dist/maplibre-gl.css';

// Maptiler vector tiles: single source for the entire basemap now, not
// just buildings. Free tier with API key.
//
// URL form verified directly against MapTiler's own docs
// (docs.maptiler.com/gl-style-specification/sources/), glyphs URL
// verified the same way (docs.maptiler.com/gl-style-specification/glyphs/).
// First attempt at the tiles URL (/data/v3.json) was an unverified guess
// and 404'd in production — everything below is checked against the
// actual schema (docs.maptiler.com/schema/planet-v4/), not pattern-matched.
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';
if (!MAPTILER_KEY) {
  console.warn(
    'VITE_MAPTILER_KEY is not set — using OpenStreetMap tiles as fallback. Get a free key at cloud.maptiler.com and set it in .env for vector tiles.'
  );
} else {
  console.log('✅ Using MapTiler vector tiles');
}

const MAPTILER_TILES_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/tiles/v4/tiles.json?key=${MAPTILER_KEY}`
  : null;
const MAPTILER_GLYPHS_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${MAPTILER_KEY}`
  : null;
const MAPTILER_ATTRIBUTION = '© <a href="https://www.maptiler.com/copyright/">MapTiler</a>';

// OpenStreetMap raster tiles (free fallback when no MapTiler key)
const OSM_TILES_URL = 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

console.log('📍 Using', MAPTILER_TILES_URL ? 'MapTiler' : 'OpenStreetMap', 'tiles');

const SOURCE_NAME = 'maptiler';

// Confirmed against MapTiler Planet v4's actual published schema
// (docs.maptiler.com/schema/planet-v4/): the building source-layer is
// literally named "building".
const BUILDING_SOURCE_LAYER = 'building';

// "Noto Sans Regular"/"Noto Sans Bold" confirmed as real hosted font
// names from MapTiler's own example (docs.maptiler.com/cloud/api/other/:
// "Roboto Medium,Noto Sans Regular/0-255.pbf"), not guessed — Inter
// (the app's actual body font) isn't necessarily hosted on their glyph
// service and I didn't want to gamble on labels silently not rendering.
const LABEL_FONT_REGULAR = ['Noto Sans Regular'];
const LABEL_FONT_BOLD = ['Noto Sans Bold'];

// Building height fields confirmed against the actual published schema
// (docs.maptiler.com/schema/planet-v4/, "building" layer): "height" and
// "height_min" — NOT "min_height", which is what this originally had
// and would've silently rendered every building flat, no error thrown,
// since MapLibre just treats an unmatched property as undefined.
// Ramped 13->16 instead of the original 15->15.05: at this app's
// default zoom (16, see below) buildings are already full height, but
// panning out to city-wide views now grows them in gradually instead
// of a near-instant, visually jarring cutoff at one exact zoom level.
function buildingPaint(color: string, opacity: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paint: any = {
    'fill-extrusion-color': color,
    'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 16, ['get', 'height']],
    'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 13, 0, 16, ['get', 'height_min']],
    'fill-extrusion-opacity': opacity,
  };
  return paint;
}

const DEFAULT_PITCH = 55; // Steeper than before — sells the 3D buildings immediately on load

// Road hierarchy by the confirmed `class` field on the `road` /
// `road_label` layers (docs.maptiler.com/schema/planet-v4/, values:
// motorway/trunk/primary/secondary/tertiary/minor/service/...).
// Width and color both step down the hierarchy, the same principle
// Apple Maps and every well-made basemap uses so the eye reads
// importance at a glance rather than every street looking identical.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROAD_CLASS: any = ['get', 'class'];
// MapLibre's nested expression tuple types are notoriously strict with
// TypeScript inference on deeply nested match/interpolate arrays. These
// are hand-verified against the real style spec, not guessed — `any`
// here sidesteps a type-checker fight, not a correctness gap.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROAD_WIDTH: any = [
  'interpolate', ['linear'], ['zoom'],
  6, ['match', ROAD_CLASS, ['motorway', 'trunk'], 1, ['primary'], 0.6, 0.2],
  20, ['match', ROAD_CLASS, ['motorway', 'trunk'], 22, ['primary'], 16, ['secondary', 'tertiary'], 11, 6],
];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROAD_COLOR: any = [
  'match', ROAD_CLASS,
  ['motorway', 'trunk'], '#4a4a4f',
  ['primary'], '#3f3f44',
  ['secondary', 'tertiary'], '#333337',
  '#2a2a2d',
];

function darkStyle(): StyleSpecification {
  // Use OSM raster tiles as fallback when MapTiler key not available
  if (!MAPTILER_TILES_URL) {
    return {
      version: 8,
      sources: {
        [SOURCE_NAME]: {
          type: 'raster',
          tiles: [OSM_TILES_URL],
          tileSize: 256,
          attribution: OSM_ATTRIBUTION,
        },
      },
      layers: [
        {
          id: 'raster',
          type: 'raster',
          source: SOURCE_NAME,
          paint: {
            'raster-opacity': 0.85,
          },
        },
      ],
    };
  }

  // Use MapTiler vector tiles when key is available
  return {
    version: 8,
    ...(MAPTILER_GLYPHS_URL && { glyphs: MAPTILER_GLYPHS_URL }),
    sources: {
      [SOURCE_NAME]: {
        type: 'vector',
        url: MAPTILER_TILES_URL!,
        attribution: MAPTILER_ATTRIBUTION,
      },
    },
    // Subtle warm-tinted ambient + directional light on the 3D
    // buildings, real MapLibre style-spec root property (confirmed via
    // docs.maptiler.com/gl-style-specification/root/), not decorative
    // CSS — gives the extrusions actual shading rather than flat color.
    light: { anchor: 'viewport', color: '#fff4e6', intensity: 0.35 },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#0a0a0a' } },
      {
        id: 'landcover',
        type: 'fill',
        source: SOURCE_NAME,
        'source-layer': 'grass',
        paint: { 'fill-color': '#141a13', 'fill-opacity': 0.6 },
      },
      {
        id: 'landuse-builtup',
        type: 'fill',
        source: SOURCE_NAME,
        'source-layer': 'residential',
        paint: { 'fill-color': '#121212' },
      },
      {
        id: 'water',
        type: 'fill',
        source: SOURCE_NAME,
        'source-layer': 'water',
        paint: { 'fill-color': '#0d1620' },
      },
      {
        id: 'buildings-flat',
        type: 'fill',
        source: SOURCE_NAME,
        'source-layer': BUILDING_SOURCE_LAYER, // buildings are visible as flat footprints even before the 3D ramp kicks in at low zoom
        maxzoom: 13,
        filter: ['!=', ['get', 'underground'], true],
        paint: { 'fill-color': '#1c1c1f' },
      },
      {
        id: 'roads',
        type: 'line',
        source: SOURCE_NAME,
        'source-layer': 'road',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROAD_COLOR, 'line-width': ROAD_WIDTH },
      },
      {
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: SOURCE_NAME,
        'source-layer': BUILDING_SOURCE_LAYER,
        minzoom: 12,
        filter: ['!=', ['get', 'underground'], true], // otherwise subway platforms and underground garages show up as floating flat shapes
        paint: buildingPaint('#242429', 0.92),
      },
      {
        id: 'road-labels',
        type: 'symbol',
        source: SOURCE_NAME,
        'source-layer': 'road_label',
        minzoom: 13,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': LABEL_FONT_REGULAR,
          'text-size': 11,
        },
        paint: {
          'text-color': '#8a8a8f',
          'text-halo-color': '#0a0a0a',
          'text-halo-width': 1,
        },
      },
      {
        id: 'place-labels',
        type: 'symbol',
        source: SOURCE_NAME,
        'source-layer': 'city_label',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': LABEL_FONT_BOLD,
          // Bigger, bolder for more important (lower rank number) places
          'text-size': ['interpolate', ['linear'], ['get', 'rank'], 1, 20, 7, 12],
        },
        paint: {
          'text-color': '#f2f2f2',
          'text-halo-color': '#0a0a0a',
          'text-halo-width': 1.4,
        },
      },
      {
        id: 'country-labels',
        type: 'symbol',
        source: SOURCE_NAME,
        'source-layer': 'country_label',
        maxzoom: 6,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': LABEL_FONT_BOLD,
          'text-size': 13,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.05,
        },
        paint: {
          'text-color': '#6a6a6f',
          'text-halo-color': '#0a0a0a',
          'text-halo-width': 1,
        },
      },
    ],
  };
}

function satelliteStyle(): StyleSpecification {
  // Satellite view: real Esri World Imagery raster underneath, the
  // same Maptiler building extrusions on top for a hybrid look. No
  // road/place labels here, keep satellite view clean.
  
  // When MapTiler key not available, just show satellite raster without buildings
  if (!MAPTILER_TILES_URL) {
    return {
      version: 8,
      sources: {
        satellite: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '© Esri',
        },
      },
      layers: [
        { id: 'satellite-raster', type: 'raster', source: 'satellite' },
      ],
    };
  }

  return {
    version: 8,
    sources: {
      satellite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri',
      },
      [SOURCE_NAME]: {
        type: 'vector',
        url: MAPTILER_TILES_URL!,
        attribution: MAPTILER_ATTRIBUTION,
      },
    },
    layers: [
      { id: 'satellite-raster', type: 'raster', source: 'satellite' },
      {
        id: 'buildings-3d-sat',
        type: 'fill-extrusion',
        source: SOURCE_NAME,
        'source-layer': BUILDING_SOURCE_LAYER,
        minzoom: 12,
        filter: ['!=', ['get', 'underground'], true],
        paint: buildingPaint('#e8e8e8', 0.75),
      },
    ],
  };
}

type Props = {
  onMapReady?: (map: MapLibreMap) => void;
  onMoveEnd?: (bounds: [number, number, number, number]) => void;
  onError?: (message: string) => void;
};

type ViewMode = 'map' | 'satellite';

// Exported as MapCanvas, not Map, so it doesn't shadow the built-in
// Map constructor wherever this gets imported alongside marker tracking.
export function MapCanvas({ onMapReady, onMoveEnd, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mode, setMode] = useState<ViewMode>('map');

  useEffect(() => {
    console.log('🗺️ MapCanvas useEffect: containerRef.current=', !!containerRef.current, 'mapRef.current=', !!mapRef.current);
    if (!containerRef.current || mapRef.current) return;

    try {
      console.log('📍 Creating MapLibreGL instance...');
      const style = darkStyle();
      console.log('🎨 Style created:', style.sources ? Object.keys(style.sources)[0] : 'unknown source');
      
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: style,
        center: [5.3221, 60.3913], // Bergen, Norway
        zoom: 15,
        pitch: DEFAULT_PITCH,
        attributionControl: false, // Hide MapLibre/MapTiler attribution
      });
      console.log('📍 MapLibreGL instance created');

      // Timeout: if load doesn't fire in 10 seconds, something's stuck
      const loadTimeout = setTimeout(() => {
        console.error('⏱️ Map load timeout (10s) - tiles may be unreachable');
        if (mapRef.current === null) { // Only error if map never loaded
          onError?.('Map tiles took too long to load. Check your network or MapTiler key.');
        }
      }, 10000);

      // Without this, a bad or unreachable tiles source (wrong URL, no
      // CORS, host down) means 'load' never fires and the caller has no
      // way to know the map is stuck rather than still loading. Whatever
      // caused it, the UI shouldn't spin forever pretending it's fine.
      map.on('error', (e: any) => {
        console.error('🔴 MapLibre error:', e.error?.message || String(e));
        clearTimeout(loadTimeout);
        onError?.(e.error?.message ?? 'Map failed to load');
      });

      map.on('load', () => {
        console.log('✅ Map ready!');
        clearTimeout(loadTimeout);
        mapRef.current = map;
        onMapReady?.(map);
      });

      map.on('moveend', () => {
        const b = map.getBounds();
        onMoveEnd?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('💥 MapLibreGL initialization failed:', err);
      onError?.(`Map init failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleModeChange(next: ViewMode) {
    const map = mapRef.current;
    if (!map || next === mode) return;
    setMode(next);
    map.setStyle(next === 'satellite' ? satelliteStyle() : darkStyle());
    map.easeTo({ pitch: next === 'satellite' ? 0 : DEFAULT_PITCH, duration: 500 });
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <VersionIndicator />
      <div style={togglePillStyle}>
        <ModeToggleButton
          icon={MapIcon}
          label="Map"
          tooltip="Map"
          selected={mode === 'map'}
          disabled={false}
          onClick={() => handleModeChange('map')}
        />
        <ModeToggleButton
          icon={Satellite}
          label="Satellite"
          tooltip="Satellite"
          selected={mode === 'satellite'}
          disabled={false}
          onClick={() => handleModeChange('satellite')}
        />
      </div>
    </div>
  );
}

type ModeToggleButtonProps = {
  icon: any; // lucide-react icon component
  label: string;
  tooltip: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
};

// Material Design 3 Expressive emerald accent
const EMERALD = '#10b981';
const TEXT_DIM = '#94a3b8';
const ON_PRIMARY = '#ffffff';

function ModeToggleButton({ icon: Icon, label, tooltip, selected, disabled, onClick }: ModeToggleButtonProps) {
  const style = useSpring({
    background: selected ? EMERALD : 'transparent',
    color: selected ? ON_PRIMARY : TEXT_DIM,
    config: { tension: 300, friction: 26 },
  });

  return (
    <animated.button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      style={{
        ...toggleButtonStyle,
        ...style,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        padding: 0,
      }}
    >
      <Icon size={20} strokeWidth={2} />
    </animated.button>
  );
}

const togglePillStyle: CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 5,
  display: 'flex',
  gap: 2,
  padding: 4,
  borderRadius: 999,
  background: 'rgba(21, 21, 21, 0.72)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
};

const toggleButtonStyle: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 999,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  fontWeight: 600,
};
