import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
// mapillary-js is ~1 MB and was imported statically, so it shipped in
// the initial bundle for every visitor — including the majority who
// never open a photo, and everyone when VITE_MAPILLARY_TOKEN is unset
// and the feature cannot run at all. Imported dynamically below instead.
import type { Viewer as MapillaryViewer } from 'mapillary-js';
import { Eye } from 'lucide-react';

// Real street-level imagery via Mapillary, not Google Street View —
// consistent with this project's whole "no Apple/Google" stance (see
// README). Coverage will genuinely be spottier than Google's, that's
// the honest tradeoff of crowdsourced imagery vs. a company that's
// driven dedicated capture vehicles down nearly every street on Earth
// for over a decade. Dense in some cities, sparse or empty elsewhere.
//
// Endpoints verified against Mapillary's own current docs before
// writing this (checked, not guessed, given how MapTiler went):
//  - coverage tiles: tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}
//  - nearest-image lookup: graph.mapillary.com/images (radius search,
//    added by Mapillary this past April per their changelog)
//  - viewer: the mapillary-js package
//
// Entirely gated behind VITE_MAPILLARY_TOKEN — get one free at
// mapillary.com/dashboard/developers. Renders nothing at all if unset.

const MAPILLARY_TOKEN = import.meta.env.VITE_MAPILLARY_TOKEN || '';
const COVERAGE_SOURCE_ID = 'mapillary-coverage';
const COVERAGE_LAYER_ID = 'mapillary-coverage-line';

type Props = {
  map: MapLibreMap | null;
};

export function StreetViewLayer({ map }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [viewerImageId, setViewerImageId] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<MapillaryViewer | null>(null);

  // Add/remove the coverage layer as the toggle flips
  useEffect(() => {
    if (!map || !MAPILLARY_TOKEN) return;

    if (!enabled) {
      if (map.getLayer(COVERAGE_LAYER_ID)) map.removeLayer(COVERAGE_LAYER_ID);
      if (map.getSource(COVERAGE_SOURCE_ID)) map.removeSource(COVERAGE_SOURCE_ID);
      return;
    }

    if (!map.getSource(COVERAGE_SOURCE_ID)) {
      map.addSource(COVERAGE_SOURCE_ID, {
        type: 'vector',
        tiles: [`https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=${MAPILLARY_TOKEN}`],
        minzoom: 6,
        maxzoom: 14,
      });
    }
    if (!map.getLayer(COVERAGE_LAYER_ID)) {
      map.addLayer({
        id: COVERAGE_LAYER_ID,
        type: 'line',
        source: COVERAGE_SOURCE_ID,
        'source-layer': 'sequence',
        paint: {
          'line-color': getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-street-wood').trim(),
          'line-width': 2,
          'line-opacity': 0.75,
        },
      });
    }

    const handleClick = async (e: MapMouseEvent) => {
      setViewerLoading(true);
      setViewerError(null);
      try {
        const url = new URL('https://graph.mapillary.com/images');
        url.searchParams.set('access_token', MAPILLARY_TOKEN);
        url.searchParams.set('fields', 'id');
        url.searchParams.set('lat', String(e.lngLat.lat));
        url.searchParams.set('lng', String(e.lngLat.lng));
        url.searchParams.set('radius', '50');
        url.searchParams.set('limit', '1');
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Mapillary responded ${resp.status}`);
        const data = await resp.json();
        const imageId = data?.data?.[0]?.id;
        if (!imageId) {
          setViewerLoading(false);
          setViewerError('No street-level photo found near that spot.');
          return;
        }
        setViewerImageId(imageId);
        setViewerLoading(false);
      } catch (err) {
        console.error('Mapillary image lookup failed:', err);
        setViewerLoading(false);
        setViewerError('Could not load a street-level photo there.');
      }
    };

    map.on('click', COVERAGE_LAYER_ID, handleClick);
    // Hint that the coverage lines are clickable
    map.on('mouseenter', COVERAGE_LAYER_ID, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', COVERAGE_LAYER_ID, () => { map.getCanvas().style.cursor = ''; });

    return () => {
      map.off('click', COVERAGE_LAYER_ID, handleClick);
    };
  }, [map, enabled]);

  // Mount/unmount the actual photo viewer when an image is selected
  useEffect(() => {
    if (!viewerImageId || !viewerContainerRef.current) return;

    let disposed = false;
    const container = viewerContainerRef.current;

    (async () => {
      const [{ Viewer }] = await Promise.all([
        import('mapillary-js'),
        import('mapillary-js/dist/mapillary.css'),
      ]);
      // The user can close the panel while the chunk is still in flight.
      if (disposed || !container) return;
      const viewer = new Viewer({
        accessToken: MAPILLARY_TOKEN,
        container,
        imageId: viewerImageId,
      });
      viewerInstanceRef.current = viewer;
    })().catch((err) => {
      console.error('Street View viewer failed to load:', err);
      setViewerError('Street View failed to load.');
    });

    return () => {
      disposed = true;
      viewerInstanceRef.current?.remove();
      viewerInstanceRef.current = null;
    };
  }, [viewerImageId]);

  if (!MAPILLARY_TOKEN) return null;

  return (
    <>
      <button
        onClick={() => setEnabled((v) => !v)}
        style={{
          ...toggleButtonStyle,
          background: enabled ? 'var(--md-sys-color-primary)' : 'rgba(21, 21, 21, 0.72)',
          color: enabled ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
        }}
        title="Toggle Street View coverage"
        aria-label="Toggle Street View coverage"
        aria-pressed={enabled}
      >
        <Eye size={17} />
      </button>

      {(viewerLoading || viewerError) && !viewerImageId && (
        <div style={statusToastStyle}>
          {viewerLoading ? 'Loading photo…' : viewerError}
        </div>
      )}

      {viewerImageId && (
        <div style={viewerOverlayStyle}>
          <div ref={viewerContainerRef} style={{ position: 'absolute', inset: 0 }} />
          <button
            onClick={() => setViewerImageId(null)}
            style={viewerCloseButtonStyle}
            aria-label="Close street view"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

const toggleButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 122,
  right: 16,
  zIndex: 5,
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  transition: 'background 0.2s var(--ease-elastic)',
};

const statusToastStyle: CSSProperties = {
  position: 'absolute',
  top: 170,
  right: 16,
  zIndex: 5,
  maxWidth: 220,
  padding: '10px 14px',
  borderRadius: 12,
  background: 'rgba(21, 21, 21, 0.85)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--lobster-text-dim)',
  fontSize: 12,
  fontFamily: 'var(--font-body)',
};

const viewerOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 16,
  zIndex: 20,
  borderRadius: 20,
  overflow: 'hidden',
  background: '#000',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  border: '1px solid rgba(255,255,255,0.1)',
};

const viewerCloseButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 21,
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(21, 21, 21, 0.85)',
  color: 'var(--lobster-text)',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
};
