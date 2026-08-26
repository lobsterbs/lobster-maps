import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';
import 'maplibre-gl/dist/maplibre-gl.css';

// Points at a self-hosted .pmtiles region extract — build one with the
// Protomaps CLI and host it yourself (see README). Never points at
// Apple's or Google's tile servers: both explicitly prohibit scraping
// or rehosting their map data in their terms of service.
const PMTILES_URL = import.meta.env.VITE_PMTILES_URL || '/tiles/region.pmtiles';
const SOURCE_NAME = 'protomaps';

// Real Protomaps assets, verified against the package's own
// generate_style.ts source (not guessed at from a URL pattern).
const GLYPHS_URL = 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf';
const SPRITE_URL = 'https://protomaps.github.io/basemaps-assets/sprites/v4/dark';

// Satellite imagery: deliberately left as a value YOU provide, not a URL
// baked in here. Two real, legal options — see README for the full
// writeup:
//  - EOX Sentinel-2 cloudless (s2maps.eu): CC-licensed, explicitly
//    offered for use as background imagery in applications like this
//    one, but it's a best-effort free service (they rate-limit under
//    load) and I couldn't confirm an exact tile URL template I was
//    fully confident in, so I'm not hardcoding a guess here.
//  - Esri World Imagery: better resolution, but per Esri's own
//    community reps the bare tile endpoint isn't actually licensed for
//    use outside ArcGIS Online / OSM editors without an ArcGIS account —
//    use it through a real ArcGIS Location Platform account, not the
//    open REST URL most tutorials paste around.
// Never Apple's or Google's satellite imagery, same ToS problem as
// their map tiles.
const SATELLITE_TILES_URL = import.meta.env.VITE_SATELLITE_TILES_URL || '';
const SATELLITE_ATTRIBUTION = import.meta.env.VITE_SATELLITE_ATTRIBUTION || 'Satellite imagery source not configured';

// Protomaps' real, professionally-tuned dark basemap palette (proper
// road hierarchy, label contrast, water/park colors), with only the
// page background swapped for Lobster's. Deliberately not tinting roads
// or land in Lobster Red — a map painted red would look garish, not
// clean. The accent color is reserved for markers and UI chrome, the
// same principle Apple Maps itself uses: neutral base map, accent color
// on pins and actions only.
const lobsterFlavor = {
  ...namedFlavor('dark'),
  background: '#0a0a0a',
};

const DEFAULT_PITCH = 45; // 3D on by default on the vector map
const SOURCE_ATTRIBUTION =
  '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>';

function vectorStyle(): StyleSpecification {
  const baseLayers = layers(SOURCE_NAME, lobsterFlavor, { lang: 'en' });
  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sprite: SPRITE_URL,
    sources: {
      [SOURCE_NAME]: {
        type: 'vector',
        url: `pmtiles://${PMTILES_URL}`,
        attribution: SOURCE_ATTRIBUTION,
      },
    },
    layers: [
      ...baseLayers,
      // Real building footprints, real height data (`height`/`min_height`
      // on the buildings source-layer, per Protomaps' schema docs) — not
      // a fabricated skyline. Buildings missing height data fall back to
      // a flat 8m rather than not rendering at all.
      {
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: SOURCE_NAME,
        'source-layer': 'buildings',
        filter: ['==', ['get', 'kind'], 'building'],
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#242428',
          'fill-extrusion-height': ['coalesce', ['get', 'height'], 8],
          'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
          'fill-extrusion-opacity': 0.9,
        },
      },
    ],
  };
}

function satelliteStyle(): StyleSpecification {
  // Hybrid view: raster imagery underneath, real place-name labels from
  // the same vector source on top, rather than a bare unlabeled image.
  const labelLayers = layers(SOURCE_NAME, lobsterFlavor, { lang: 'en' }).filter(
    (l) => l.type === 'symbol'
  );
  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      satellite: {
        type: 'raster',
        tiles: SATELLITE_TILES_URL ? [SATELLITE_TILES_URL] : [],
        tileSize: 256,
        attribution: SATELLITE_ATTRIBUTION,
      },
      [SOURCE_NAME]: {
        type: 'vector',
        url: `pmtiles://${PMTILES_URL}`,
        attribution: SOURCE_ATTRIBUTION,
      },
    },
    layers: [
      { id: 'satellite', type: 'raster', source: 'satellite' },
      ...labelLayers,
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

    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: vectorStyle(),
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
      maplibregl.removeProtocol('pmtiles');
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleModeChange(next: ViewMode) {
    const map = mapRef.current;
    if (!map || next === mode) return;
    if (next === 'satellite' && !SATELLITE_TILES_URL) return; // no source configured yet, see README
    setMode(next);
    map.setStyle(next === 'satellite' ? satelliteStyle() : vectorStyle());
    map.easeTo({ pitch: next === 'satellite' ? 0 : DEFAULT_PITCH, duration: 500 });
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={togglePillStyle}>
        {(['map', 'satellite'] as const).map((m) => {
          const disabled = m === 'satellite' && !SATELLITE_TILES_URL;
          return (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              disabled={disabled}
              title={disabled ? 'Set VITE_SATELLITE_TILES_URL to enable — see README' : undefined}
              style={{
                ...toggleButtonStyle,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                color: mode === m ? '#0a0a0a' : 'var(--lobster-text-dim)',
                background: mode === m ? 'var(--lobster-gold)' : 'transparent',
              }}
            >
              {m === 'map' ? 'Map' : 'Satellite'}
            </button>
          );
        })}
      </div>
    </div>
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
  transition: 'background 0.2s var(--ease-elastic), color 0.2s var(--ease-elastic)',
};
