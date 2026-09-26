'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import * as maplibregl from 'maplibre-gl';
import { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { animated, useTransition } from '@react-spring/web';
import 'maplibre-gl/dist/maplibre-gl.css';

import { M3eSearchBar } from '@m3e/react/search';
import { M3eNavRail } from '@m3e/react/nav-rail';
import { M3eNavItem } from '@m3e/react/nav-bar';
import { M3eFab } from '@m3e/react/fab';
import { M3eFabMenu, M3eFabMenuTrigger, M3eFabMenuItem } from '@m3e/react/fab-menu';
import { M3eSegmentedButton, M3eButtonSegment } from '@m3e/react/segmented-button';
import { M3eSwitch } from '@m3e/react/switch';
import { M3eIcon } from '@m3e/react/icon';

import { AddLocationModal } from './AddLocationModal';
import { ReportIssueModal } from './ReportIssueModal';

import {
  BASEMAPS,
  DEFAULT_BASEMAP,
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

// The basemap is no longer hand-built here. MapTiler publishes finished
// styles at /maps/{id}/style.json with sprites, glyphs and POIs already
// wired, so we use those and only add OUR layers on top: 3D terrain,
// building extrusions where the style has none, and whatever App draws
// (routes, markers).

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
  const [selectedMode, setSelectedMode] = useState<string>('driving');
  const [searchValue, setSearchValue] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<
    Array<{ id: string; label: string; desc?: string; lat?: number; lon?: number }>
  >([]);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);

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
      const colors = getM3Colors();
      map.setSky({
        'sky-color': colors.skyDark,
        'horizon-color': colors.horizonDark,
        'fog-color': colors.fogDark,
      });
    }

    // --- Language ---------------------------------------------------
    for (const layer of map.getStyle()?.layers ?? []) {
      if (layer.type !== 'symbol') continue;
      const textField = (layer.layout as { 'text-field'?: unknown } | undefined)?.['text-field'];
      if (!textField) continue;
      try {
        map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:no'], ['get', 'name']]);
      } catch {
        // A layer with an exotic text-field expression is not worth
        // failing the whole style over; leave it in the default language.
      }
    }

    // --- 3D buildings ------------------------------------------------
    if (!map.getLayer(BUILDINGS_LAYER_ID) && !hasExtrusionLayer(map)) {
      const vectorSource = findVectorSourceId(map);
      if (vectorSource) {
        const colors = getM3Colors();
        const buildingColor = active.imagery ? colors.buildingSatellite : colors.buildingDark;
        map.addLayer({
          id: BUILDINGS_LAYER_ID,
          type: 'fill-extrusion',
          source: vectorSource,
          'source-layer': BUILDING_SOURCE_LAYER,
          minzoom: 13,
          filter: ['!=', ['get', 'underground'], true],
          paint: {
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

    const initialStyle: string | StyleSpecification = hasMapTiler ? styleUrl(DEFAULT_BASEMAP) : osmFallbackStyle();

    if (!hasMapTiler) {
      console.warn(
        'VITE_MAPTILER_KEY was not set at build time — falling back to proxied OpenStreetMap raster tiles.'
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
        maxPitch: 85,
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

    map.on('error', (e) => {
      const msg = e.error?.message ?? String(e);
      if (loadedRef.current) {
        console.warn('MapLibre (non-fatal):', msg);
        return;
      }
      if (/40[13]|forbidden|unauthor/i.test(msg)) {
        clearTimeout(loadTimeout);
        onError?.('MapTiler rejected the request (401/403). The API key is missing, wrong, or this domain is not on the key allowlist.');
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

    if (nextIdx !== currentIdx) switchBasemap(BASEMAPS[nextIdx].id);
  }

  function switchBasemap(next: BasemapId) {
    const map = mapRef.current;
    if (!map || next === basemap || !hasMapTiler) return;
    setBasemap(next);
    basemapRef.current = next;

    map.setStyle(styleUrl(next));
    map.once('styledata', () => {
      applyCustomLayers(map);
      onStyleReloadRef.current?.(map);
    });
  }

  function toggleTerrain() {
    const map = mapRef.current;
    if (!map || !hasMapTiler) return;
    const next = !terrainRef.current;
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
      mapRef.current?.flyTo({ center: [result.lon, result.lat], zoom: 16, duration: 1200 });
    }
  };

  const mapCenter: [number, number] = [
    mapRef.current?.getCenter().lng ?? BERGEN[0],
    mapRef.current?.getCenter().lat ?? BERGEN[1],
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Search bar (top, full width). m3e-search-bar renders chrome only —
          the actual <input> is a real slotted element so onChange/onInput
          are ordinary DOM events, not custom-element quirks. */}
      <div style={{ padding: '16px', zIndex: 50, backgroundColor: 'transparent' }}>
        <M3eSearchBar clearable>
          <input
            slot="input"
            placeholder="Search businesses, streets..."
            value={searchValue}
            onChange={(e) => handleSearchInput(e.currentTarget.value)}
          />
        </M3eSearchBar>
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
        {/* Nav rail (left sidebar) */}
        <M3eNavRail style={{ borderRight: '1px solid var(--md-sys-color-outline-variant)' }}>
          <M3eNavItem selected>
            <M3eIcon slot="icon" name="map" />
            Map
          </M3eNavItem>
          <M3eNavItem>
            <M3eIcon slot="icon" name="near_me" />
            Nearby
          </M3eNavItem>
        </M3eNavRail>

        {/* Map container */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

          {/* Top-right controls: mode toggle, terrain, basemap */}
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '12px',
                backgroundColor: 'rgba(30,30,30,0.4)',
                borderRadius: 'var(--md-sys-shape-corner-large)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <M3eSegmentedButton value={selectedMode} onChange={(e: any) => setSelectedMode(e.currentTarget.value)}>
                <M3eButtonSegment value="driving">Car</M3eButtonSegment>
                <M3eButtonSegment value="transit">Transit</M3eButtonSegment>
                <M3eButtonSegment value="walking">Walk</M3eButtonSegment>
              </M3eSegmentedButton>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '12px',
                backgroundColor: 'rgba(30,30,30,0.4)',
                borderRadius: 'var(--md-sys-shape-corner-large)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--md-sys-color-on-surface)', fontSize: '14px', cursor: 'pointer' }}>
                <M3eSwitch checked={terrain} onChange={() => toggleTerrain()} />
                <span>3D Terrain</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--md-sys-color-on-surface)', fontSize: '14px', cursor: 'pointer' }}>
                <M3eSwitch checked={panelOpen} onChange={() => setPanelOpen((o) => !o)} />
                <span>Basemaps</span>
              </label>
            </div>
          </div>

          {/* FAB Menu (bottom-right). Trigger must be nested inside the FAB
              per the library's documented anatomy, not a sibling slot. */}
          <div style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 20 }}>
            <M3eFab variant="primary" size="large">
              <M3eFabMenuTrigger htmlFor="lobster-fab-menu">
                <M3eIcon name="add" />
              </M3eFabMenuTrigger>
            </M3eFab>
            <M3eFabMenu id="lobster-fab-menu" variant="primary">
              <M3eFabMenuItem onClick={() => setAddLocationOpen(true)}>
                <M3eIcon slot="icon" name="add_location" filled />
                Add Location
              </M3eFabMenuItem>
              <M3eFabMenuItem onClick={() => setReportIssueOpen(true)}>
                <M3eIcon slot="icon" name="report" filled />
                Report Issue
              </M3eFabMenuItem>
            </M3eFabMenu>
          </div>

          {/* Basemap switcher pills */}
          {pillTransition(
            (style, open) =>
              open && (
                <animated.div style={{ ...style, ...pillContainerStyle }} role="radiogroup" aria-label="Basemap options" onKeyDown={handleBasemapKeyDown}>
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

          {/* Modals — Add Business lives in App.tsx (owns marker refresh on create) */}
          <AddLocationModal open={addLocationOpen} onClose={() => setAddLocationOpen(false)} mapCenter={mapCenter} />
          <ReportIssueModal open={reportIssueOpen} onClose={() => setReportIssueOpen(false)} mapCenter={mapCenter} />
        </div>
      </div>
    </div>
  );
}

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
