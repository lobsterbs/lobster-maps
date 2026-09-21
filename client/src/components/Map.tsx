import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import * as maplibregl from 'maplibre-gl';
import { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { Layers, Mountain, Check } from 'lucide-react';
import { animated, useSpring, useTransition } from '@react-spring/web';
import VersionIndicator from './VersionIndicator';
import {
  BASEMAPS,
  DEFAULT_BASEMAP,
  MAPTILER_ATTRIBUTION,
  OSM_ATTRIBUTION,
  OSM_PROXY_TILES,
  TERRAIN_MAX_ZOOM,
  TERRAIN_SOURCE_ID,
  TERRAIN_TILEJSON,
  getBasemap,
  hasMapTiler,
  styleUrl,
  type BasemapId,
} from '../lib/maptiler';
import 'maplibre-gl/dist/maplibre-gl.css';

// The basemap is no longer hand-built here. Previously this file
// assembled its own dark style layer by layer against the Planet v4
// schema, which meant every source-layer and field name was a chance to
// silently render nothing (that is exactly how buildings ended up flat
// on `min_height` vs `height_min`, and how the tiles URL 404'd).
// MapTiler publishes finished, professionally designed styles at
// /maps/{id}/style.json with sprites, glyphs and POIs already wired, so
// we use those and only add OUR layers on top: 3D terrain, building
// extrusions where the style has none, and whatever App draws (routes,
// markers).
//
// Consequence worth knowing: the browser fetches tiles straight from
// MapTiler's CDN. See lib/maptiler.ts for why that beats proxying them
// through Render, and lock the key down with an origin restriction in
// the MapTiler dashboard.

const BERGEN: [number, number] = [5.3221, 60.3913];
const DEFAULT_PITCH = 55;
const TERRAIN_EXAGGERATION = 1.4;
const LOAD_TIMEOUT_MS = 12000;

const BUILDING_SOURCE_LAYER = 'building'; // docs.maptiler.com/schema/planet-v4/
const BUILDINGS_LAYER_ID = 'lobster-buildings-3d';

/** Keyless fallback so a missing build-time key shows a map, not a void. */
function osmFallbackStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: [OSM_PROXY_TILES],
        tileSize: 256,
        attribution: OSM_ATTRIBUTION,
      },
    },
    layers: [{ id: 'osm-raster', type: 'raster', source: 'osm' }],
  };
}

/** First vector source in the loaded style, whatever MapTiler named it. */
function findVectorSourceId(map: MapLibreMap): string | null {
  const sources = map.getStyle()?.sources ?? {};
  for (const [id, src] of Object.entries(sources)) {
    if ((src as { type?: string }).type === 'vector') return id;
  }
  return null;
}

function hasExtrusionLayer(map: MapLibreMap): boolean {
  return (map.getStyle()?.layers ?? []).some((l) => l.type === 'fill-extrusion');
}

export type MapCanvasHandle = {
  map: MapLibreMap | null;
};

type Props = {
  onMapReady?: (map: MapLibreMap) => void;
  onMoveEnd?: (bounds: [number, number, number, number]) => void;
  onError?: (message: string) => void;
  /**
   * Fired after a basemap switch has re-created the style. Anything the
   * host drew onto the map (route lines, GeoJSON sources) is destroyed
   * by setStyle and has to be redrawn here.
   */
  onStyleReload?: (map: MapLibreMap) => void;
};

export function MapCanvas({ onMapReady, onMoveEnd, onError, onStyleReload }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP);
  const [terrain, setTerrain] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  // Refs mirror state so the style-reload handler always reads the
  // current selection rather than the value captured when it was bound.
  const basemapRef = useRef(basemap);
  const terrainRef = useRef(terrain);
  basemapRef.current = basemap;
  terrainRef.current = terrain;

  const onStyleReloadRef = useRef(onStyleReload);
  onStyleReloadRef.current = onStyleReload;

  /** Re-attach everything that is ours, not MapTiler's. Idempotent. */
  const applyCustomLayers = useCallback((map: MapLibreMap) => {
    const active = getBasemap(basemapRef.current);

    // --- 3D terrain -----------------------------------------------
    if (hasMapTiler) {
      if (!map.getSource(TERRAIN_SOURCE_ID)) {
        map.addSource(TERRAIN_SOURCE_ID, {
          type: 'raster-dem',
          url: TERRAIN_TILEJSON(),
          maxzoom: TERRAIN_MAX_ZOOM,
        });
      }
      map.setTerrain(terrainRef.current ? { source: TERRAIN_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION } : null);
      // Sky sits behind the horizon once the ground is tilted. Without
      // it a pitched map fades to flat background above the terrain.
      map.setSky(
        active.dark
          ? { 'sky-color': '#0b1220', 'horizon-color': '#1c2433', 'fog-color': '#0a0a0a' }
          : { 'sky-color': '#88c6fc', 'horizon-color': '#dbeafe', 'fog-color': '#e8eef7' }
      );
    }

    // --- Language --------------------------------------------------
    // MapTiler's styles label in English by default. Planet v4 carries
    // localised names as `name:{code}` on every label layer, so a Bergen
    // map can show Bergen's own names. Falls back to `name` wherever a
    // Norwegian translation does not exist, which is most street names.
    for (const layer of map.getStyle()?.layers ?? []) {
      if (layer.type !== 'symbol') continue;
      const textField = (layer.layout as { 'text-field'?: unknown } | undefined)?.['text-field'];
      if (!textField) continue;
      try {
        map.setLayoutProperty(layer.id, 'text-field', [
          'coalesce',
          ['get', 'name:no'],
          ['get', 'name'],
        ]);
      } catch {
        // A layer with an exotic text-field expression is not worth
        // failing the whole style over; leave it in the default language.
      }
    }

    // --- 3D buildings ---------------------------------------------
    // Only when the chosen MapTiler style does not already extrude.
    // Satellite/hybrid never does, most street styles do not either at
    // the moment, but checking means we never double-draw.
    if (!map.getLayer(BUILDINGS_LAYER_ID) && !hasExtrusionLayer(map)) {
      const vectorSource = findVectorSourceId(map);
      if (vectorSource) {
        map.addLayer({
          id: BUILDINGS_LAYER_ID,
          type: 'fill-extrusion',
          source: vectorSource,
          'source-layer': BUILDING_SOURCE_LAYER,
          minzoom: 13,
          filter: ['!=', ['get', 'underground'], true],
          paint: {
            // `height` and `height_min` are the real Planet v4 field
            // names. Ramped over zoom so buildings grow in instead of
            // popping at one exact zoom level.
            'fill-extrusion-color': active.imagery ? '#e8e8e8' : active.dark ? '#242429' : '#c9ccd4',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 16, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 13, 0, 16, ['get', 'height_min']],
            'fill-extrusion-opacity': active.imagery ? 0.75 : 0.92,
          },
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialStyle: string | StyleSpecification = hasMapTiler
      ? styleUrl(DEFAULT_BASEMAP)
      : osmFallbackStyle();

    if (!hasMapTiler) {
      console.warn(
        'VITE_MAPTILER_KEY was not set at build time — falling back to proxied OpenStreetMap raster tiles. ' +
          'Set it in Render (and rebuild) for vector styles, 3D terrain and buildings.'
      );
    }

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: initialStyle,
        center: BERGEN,
        zoom: 15,
        pitch: DEFAULT_PITCH,
        maxPitch: 85, // terrain is worth looking along, not just down at
        attributionControl: false,
      });
    } catch (err) {
      onError?.(`Map init failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    mapRef.current = map;

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: hasMapTiler ? MAPTILER_ATTRIBUTION : OSM_ATTRIBUTION,
      }),
      'bottom-right'
    );

    // Attribution is a licence term for both MapTiler and OSM, not
    // decoration — it was previously switched off entirely. Compact
    // keeps it to a single "i" disc on mobile.

    const loadTimeout = setTimeout(() => {
      if (loadedRef.current) return;
      console.error('Map load timed out after', LOAD_TIMEOUT_MS, 'ms');
      onError?.(
        hasMapTiler
          ? 'The map tiles did not load in time. Check that VITE_MAPTILER_KEY is valid and that this domain is allowed on the key in your MapTiler dashboard.'
          : 'The map tiles did not load in time, and no MapTiler key is configured.'
      );
    }, LOAD_TIMEOUT_MS);

    // A single missing tile fires 'error' too. Treating every error as
    // fatal is what previously replaced a working map with a full-screen
    // failure state. Only errors before first load are fatal; after that
    // they are logged and the map carries on.
    map.on('error', (e) => {
      const msg = e.error?.message ?? String(e);
      if (loadedRef.current) {
        console.warn('MapLibre (non-fatal):', msg);
        return;
      }
      if (/40[13]|forbidden|unauthor/i.test(msg)) {
        clearTimeout(loadTimeout);
        onError?.(
          'MapTiler rejected the request (401/403). The API key is missing, wrong, or this domain is not on the key allowlist.'
        );
        return;
      }
      console.warn('MapLibre (pre-load):', msg);
    });

    map.on('load', () => {
      loadedRef.current = true;
      clearTimeout(loadTimeout);
      applyCustomLayers(map);
      onMapReady?.(map);
    });

    map.on('moveend', () => {
      const b = map.getBounds();
      onMoveEnd?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    });

    return () => {
      clearTimeout(loadTimeout);
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBasemapKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const currentIdx = BASEMAPS.findIndex((b) => b.id === basemap);
    let nextIdx = currentIdx;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (currentIdx + 1) % BASEMAPS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (currentIdx - 1 + BASEMAPS.length) % BASEMAPS.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIdx = BASEMAPS.length - 1;
    }

    if (nextIdx !== currentIdx) {
      switchBasemap(BASEMAPS[nextIdx].id);
    }
  }

  function switchBasemap(next: BasemapId) {
    const map = mapRef.current;
    if (!map || next === basemap || !hasMapTiler) return;
    setBasemap(next);
    basemapRef.current = next;

    map.setStyle(styleUrl(next));
    // setStyle discards every source and layer, ours included. Re-add
    // them once the replacement style has parsed.
    map.once('styledata', () => {
      applyCustomLayers(map);
      onStyleReloadRef.current?.(map);
    });
  }

  function toggleTerrain() {
    const map = mapRef.current;
    if (!map || !hasMapTiler) return;
    const next = !terrain;
    setTerrain(next);
    terrainRef.current = next;

    if (!map.getSource(TERRAIN_SOURCE_ID)) {
      map.addSource(TERRAIN_SOURCE_ID, {
        type: 'raster-dem',
        url: TERRAIN_TILEJSON(),
        maxzoom: TERRAIN_MAX_ZOOM,
      });
    }
    map.setTerrain(next ? { source: TERRAIN_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION } : null);
    // Tilt into the terrain so switching it on is visible immediately
    // rather than looking like nothing happened from straight above.
    if (next && map.getPitch() < 50) map.easeTo({ pitch: 65, duration: 600 });
  }

  const pillTransition = useTransition(panelOpen, {
    from: { opacity: 0, transform: 'translateY(-8px) scale(0.96)' },
    enter: { opacity: 1, transform: 'translateY(0px) scale(1)' },
    leave: { opacity: 0, transform: 'translateY(-8px) scale(0.96)' },
    config: { tension: 320, friction: 26 },
  });

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <VersionIndicator />

      <div style={controlStackStyle}>
        <IconToggle
          icon={Layers}
          label="Basemap"
          active={panelOpen}
          disabled={!hasMapTiler}
          onClick={() => setPanelOpen((o) => !o)}
        />
        <IconToggle
          icon={Mountain}
          label="3D terrain"
          active={terrain}
          disabled={!hasMapTiler}
          onClick={toggleTerrain}
        />
      </div>

      {/* M3 horizontal basemap pill switcher */}
      {pillTransition(
        (style, open) =>
          open && (
            <animated.div 
              style={{ ...style, ...pillContainerStyle }}
              role="radiogroup"
              aria-label="Basemap options"
              onKeyDown={handleBasemapKeyDown}
            >
              {BASEMAPS.map((b) => {
                const selected = b.id === basemap;
                return (
                  <button
                    key={b.id}
                    onClick={() => switchBasemap(b.id)}
                    title={b.hint}
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected ? 0 : -1}
                    style={{
                      ...pillStyle,
                      background: selected ? EMERALD : 'rgba(30,30,30,0.6)',
                      color: selected ? '#fff' : TEXT_DIM,
                      borderColor: selected ? EMERALD : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    {b.label}
                  </button>
                );
              })}
            </animated.div>
          )
      )}
    </div>
  );
}

const EMERALD = '#10b981';
const TEXT_DIM = '#94a3b8';

type IconToggleProps = {
  // lucide-react icon component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
};

function IconToggle({ icon: Icon, label, active, disabled, onClick }: IconToggleProps) {
  const style = useSpring({
    background: active ? EMERALD : 'rgba(21,21,21,0.72)',
    color: active ? '#ffffff' : TEXT_DIM,
    config: { tension: 300, friction: 26 },
  });

  return (
    <animated.button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `${label} needs a MapTiler key` : label}
      aria-label={label}
      aria-pressed={active}
      style={{
        ...style,
        width: 48,
        height: 48,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon size={20} strokeWidth={2} />
    </animated.button>
  );
}

const controlStackStyle: CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 5,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const pillContainerStyle: CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: 16,
  right: 16,
  zIndex: 6,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  justifyContent: 'center',
  padding: '12px 16px',
  borderRadius: 28,
  background: 'rgba(15,15,15,0.8)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  maxWidth: 'calc(100vw - 32px)',
};

const pillStyle: CSSProperties = {
  padding: '8px 16px',
  minHeight: 36,
  borderRadius: 18,
  border: '1px solid',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  transition: 'all 200ms ease-out',
  WebkitUserSelect: 'none',
  userSelect: 'none',
};
