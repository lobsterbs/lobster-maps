import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { animated, useSpring } from '@react-spring/web';
import 'maplibre-gl/dist/maplibre-gl.css';

// OpenStreetMap raster tiles: global coverage, zero config. Standard Z/X/Y
// format served by the OSM project itself.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';

// Maptiler vector tiles, used here just for 3D building footprints
// globally. Free tier with API key.
//
// Verified directly against MapTiler's own docs
// (docs.maptiler.com/gl-style-specification/sources/): the URL form is
// /tiles/{tilesetid}/tiles.json — "v4" is their Planet v4 global
// tileset. First attempt (/data/v3.json) was an unverified guess and
// 404'd in production.
const MAPTILER_KEY = 'wbQhKmIrXoSFpnzJmV4w';
const MAPTILER_TILES_URL = `https://api.maptiler.com/tiles/v4/tiles.json?key=${MAPTILER_KEY}`;
const MAPTILER_ATTRIBUTION =
  '© <a href="https://www.maptiler.com/copyright/">MapTiler</a>';

// Confirmed against MapTiler Planet v4's actual published schema
// (docs.maptiler.com/schema/planet-v4/, "building" layer): the source
// layer name is "building", and the height fields are "height" and
// "height_min" — NOT "min_height", which is what this originally had
// and would have silently rendered every building at height 0 with no
// error, just flat extrusions, since MapLibre doesn't error on an
// unmatched property name.
const BUILDING_SOURCE_LAYER = 'building';

const DEFAULT_PITCH = 45; // Enable 3D for building extrusions

function rasterStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: [TILE_URL],
        tileSize: 256,
        attribution: OSM_ATTRIBUTION,
      },
      maptiler_data: {
        type: 'vector',
        url: MAPTILER_TILES_URL,
        attribution: MAPTILER_ATTRIBUTION,
      },
    },
    layers: [
      {
        id: 'osm-raster',
        type: 'raster',
        source: 'osm',
        minzoom: 0,
        maxzoom: 19,
      },
      {
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'maptiler_data',
        'source-layer': BUILDING_SOURCE_LAYER,
        paint: {
          'fill-extrusion-color': '#242428',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height_min']],
          'fill-extrusion-opacity': 0.85,
        },
      },
    ],
  };
}

function satelliteStyle(): StyleSpecification {
  // Satellite view: OSM-style raster (Esri World Imagery) + the same
  // Maptiler buildings layer, no labels layer on top for satellite.
  return {
    version: 8,
    sources: {
      satellite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri',
      },
      maptiler_data: {
        type: 'vector',
        url: MAPTILER_TILES_URL,
        attribution: MAPTILER_ATTRIBUTION,
      },
    },
    layers: [
      {
        id: 'satellite-raster',
        type: 'raster',
        source: 'satellite',
      },
      {
        id: 'buildings-3d-sat',
        type: 'fill-extrusion',
        source: 'maptiler_data',
        'source-layer': BUILDING_SOURCE_LAYER,
        paint: {
          'fill-extrusion-color': '#e8e8e8',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height_min']],
          'fill-extrusion-opacity': 0.8,
        },
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
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: rasterStyle(),
      center: [-73.9857, 40.7484],
      zoom: 12,
      pitch: DEFAULT_PITCH,
    });

    // Without this, a bad or unreachable tiles source (wrong URL, no
    // CORS, host down) means 'load' never fires and the caller has no
    // way to know the map is stuck rather than still loading. Whatever
    // caused it, the UI shouldn't spin forever pretending it's fine.
    map.on('error', (e) => {
      onError?.(e.error?.message ?? 'Map failed to load');
    });

    map.on('load', () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleModeChange(next: ViewMode) {
    const map = mapRef.current;
    if (!map || next === mode) return;
    setMode(next);
    map.setStyle(next === 'satellite' ? satelliteStyle() : rasterStyle());
    map.easeTo({ pitch: next === 'satellite' ? 0 : DEFAULT_PITCH, duration: 500 });
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={togglePillStyle}>
        {(['map', 'satellite'] as const).map((m) => (
          <ModeToggleButton
            key={m}
            label={m === 'map' ? 'Map' : 'Satellite'}
            selected={mode === m}
            disabled={false}
            onClick={() => handleModeChange(m)}
          />
        ))}
      </div>
    </div>
  );
}

type ModeToggleButtonProps = {
  label: string;
  selected: boolean;
  disabled: boolean;
  title?: string;
  onClick: () => void;
};

// react-spring can't interpolate `var(--lobster-gold)` directly — it
// needs an actual color value to animate between, the same reason
// LoadingMorph.tsx hardcodes a literal hex instead of the CSS custom
// property. Keep these in sync with tokens.css.
const GOLD = '#d4a574';
const TEXT_DIM = '#a3a3a3';
const INK = '#0a0a0a';

function ModeToggleButton({ label, selected, disabled, title, onClick }: ModeToggleButtonProps) {
  const style = useSpring({
    background: selected ? GOLD : 'transparent',
    color: selected ? INK : TEXT_DIM,
    config: { tension: 300, friction: 26 },
  });

  return (
    <animated.button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...toggleButtonStyle,
        ...style,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
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
