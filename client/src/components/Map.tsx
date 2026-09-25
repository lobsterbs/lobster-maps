'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import * as maplibregl from 'maplibre-gl';
import { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { animated, useSpring, useTransition } from '@react-spring/web';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@m3e/react/search';
import '@m3e/react/nav-rail';
import '@m3e/react/fab-menu';
import '@m3e/react/fab';
import '@m3e/react/segmented-button';
import '@m3e/react/icon-button';

import { AddBusinessModal } from './AddBusinessModal';
import { AddLocationModal } from './AddLocationModal';
import { ReportIssueModal } from './ReportIssueModal';

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

/** Get M3 semantic colors from CSS variables (respects dark/light theme) */
function getM3Colors() {
  const root = document.documentElement;
  const getVar = (name: string) => getComputedStyle(root).getPropertyValue(name).trim();
  return {
    skyDark: getVar('--md-sys-color-sky-dark'),
    horizonDark: getVar('--md-sys-color-horizon-dark'),
    fogDark: getVar('--md-sys-color-fog-dark'),
    buildingDark: getVar('--md-sys-color-building-dark'),
    buildingDim: getVar('--md-sys-color-building-dim'),
    buildingSatellite: getVar('--md-sys-color-building-satellite'),
  };
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
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<string>('driving');
  const [searchValue, setSearchValue] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ id: string; label: string; desc?: string; lat?: number; lon?: number }>>([]); const [addBusinessOpen, setAddBusinessOpen] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);;

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
      const colors = getM3Colors();
      map.setSky({
        'sky-color': colors.skyDark,
        'horizon-color': colors.horizonDark,
        'fog-color': colors.fogDark,
      });
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
        const colors = getM3Colors();
        const buildingColor = active.imagery 
          ? colors.buildingSatellite 
          : colors.buildingDark;
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
            'fill-extrusion-color': buildingColor,
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
      setLoading(false);
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

  const handleSearchInput = async (query: string) => {
    setSearchValue(query);
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userLat: mapRef.current?.getCenter().lat ?? BERGEN[1],
          userLon: mapRef.current?.getCenter().lng ?? BERGEN[0],
          radius: 5000,
        }),
      });
      const data = await res.json();
      if (data.results) {
        setSearchSuggestions(
          data.results.slice(0, 8).map((r: any) => ({
            id: r.id,
            label: r.name,
            desc: r.type || 'Location',
            lat: r.lat,
            lon: r.lon,
          }))
        );
      }
    } catch (err) {
      console.warn('Search error:', err);
    }
  };

  const handleSearchSelect = (id: string) => {
    const result = searchSuggestions.find((s) => s.id === id);
    if (result && result.lat !== undefined && result.lon !== undefined) {
      setSearchValue(result.label);
      setSearchSuggestions([]);
      // Fly to result location with smooth animation
      mapRef.current?.flyTo({
        center: [result.lon, result.lat],
        zoom: 16,
        duration: 1200, // 1.2s smooth transition
      });
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* M3E SearchBar (top, full width) */}
      <div style={{ padding: '16px', zIndex: 50, backgroundColor: 'transparent' }}>
        <m3e-search 
          placeholder="Search businesses, streets..."
          onInput={(e: any) => handleSearchInput(e.currentTarget.value)}
        />
        {searchSuggestions.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {searchSuggestions.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSearchSelect(s.id)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  fontSize: '14px',
                }}
              >
                <div style={{ fontWeight: 500 }}>{s.label}</div>
                {s.desc && <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>{s.desc}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main content flex row */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0 }}>
        {/* M3E NavRail (left sidebar) */}
        <m3e-nav-rail style={{ borderRight: '1px solid var(--md-sys-color-outline-variant)' }}>
          <m3e-nav-rail-item label="Map" selected />
          <m3e-nav-rail-item label="Nearby" />
          <m3e-fab slot="fab" />
        </m3e-nav-rail>

        {/* Map container */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

          {/* Top right controls: Mode toggle + Terrain */}
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <m3e-segmented-button value={selectedMode} onChange={(e: any) => setSelectedMode(e.currentTarget.value)}>
              <m3e-segmented-button-segment value="driving">Car</m3e-segmented-button-segment>
              <m3e-segmented-button-segment value="transit">Transit</m3e-segmented-button-segment>
              <m3e-segmented-button-segment value="walking">Walk</m3e-segmented-button-segment>
            </m3e-segmented-button>
            <m3e-icon-button 
              onClick={toggleTerrain}
              title={terrain ? 'Disable 3D terrain' : 'Enable 3D terrain'}
              selected={terrain}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l8 5v8l-8 5-8-5v-8l8-5m0 2.5l-6 3.75v6.25l6 3.75 6-3.75v-6.25L12 4.5z"/>
              </svg>
            </m3e-icon-button>
            <m3e-icon-button 
              onClick={() => setPanelOpen((o) => !o)}
              title="Switch basemap style"
              selected={panelOpen}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </m3e-icon-button>
          </div>

          {/* Bottom controls: FAB Menu */}
          <div style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 20 }}>
            <m3e-fab-menu>
              <m3e-fab slot="trigger" />
              <m3e-fab-menu-action onClick={() => setAddBusinessOpen(true)}>
                Add Business
              </m3e-fab-menu-action>
              <m3e-fab-menu-action onClick={() => setAddLocationOpen(true)}>
                Add Location
              </m3e-fab-menu-action>
              <m3e-fab-menu-action onClick={() => setReportIssueOpen(true)}>
                Report Issue
              </m3e-fab-menu-action>
            </m3e-fab-menu>
          </div>

          {/* Basemap switcher */}
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
                          background: selected ? 'var(--md-sys-color-primary)' : 'rgba(30,30,30,0.6)',
                          color: selected ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                          borderColor: selected ? 'var(--md-sys-color-primary)' : 'rgba(255,255,255,0.12)',
                        }}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </animated.div>
              )
          )}

        {/* Modals */}
        <AddBusinessModal
          open={addBusinessOpen}
          onClose={() => setAddBusinessOpen(false)}
          onCreated={() => {
            // TODO: Refetch businesses or add marker
          }}
          mapCenter={[mapRef.current?.getCenter().lng ?? BERGEN[0], mapRef.current?.getCenter().lat ?? BERGEN[1]]}
        />
        <AddLocationModal
          open={addLocationOpen}
          onClose={() => setAddLocationOpen(false)}
          mapCenter={[mapRef.current?.getCenter().lng ?? BERGEN[0], mapRef.current?.getCenter().lat ?? BERGEN[1]]}
        />
        <ReportIssueModal
          open={reportIssueOpen}
          onClose={() => setReportIssueOpen(false)}
          mapCenter={[mapRef.current?.getCenter().lng ?? BERGEN[0], mapRef.current?.getCenter().lat ?? BERGEN[1]]}
        />
        </div>
      </div>
    </div>
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
  padding: '12px 16px',
  minHeight: 48,
  borderRadius: 24,
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
