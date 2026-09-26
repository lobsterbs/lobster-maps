import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { M3eNavRail } from '@m3e/react/nav-rail';
import { M3eFab } from '@m3e/react/fab';
import { M3eFabMenu, M3eFabMenuTrigger, M3eFabMenuItem } from '@m3e/react/fab-menu';
import { M3eSegmentedButton, M3eButtonSegment } from '@m3e/react/segmented-button';
import { M3eSwitch } from '@m3e/react/switch';
import { M3eSearchBar } from '@m3e/react/search';

const BERGEN: [number, number] = [5.3221, 60.3913];

interface Props {
  onMapReady?: (map: maplibregl.Map) => void;
  onMoveEnd?: (bounds: [number, number, number, number]) => void;
  onError?: (message: string) => void;
  onStyleReload?: (map: maplibregl.Map) => void;
}

export function Map({ onMapReady, onMoveEnd, onError, onStyleReload }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [terrain, setTerrain] = useState(false);
  const [selectedMode, setSelectedMode] = useState('driving');
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=st6o11zRZ5rBnmLDbS6K',
        center: BERGEN,
        zoom: 13,
        pitch: 0,
      });

      mapRef.current.on('load', () => {
        onMapReady?.(mapRef.current!);
      });

      mapRef.current.on('moveend', () => {
        if (!mapRef.current) return;
        const bounds = mapRef.current.getBounds();
        onMoveEnd?.([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
      });

      mapRef.current.on('error', (e: any) => {
        onError?.(e.error?.message || 'Map error');
      });

      mapRef.current.on('style.load', () => {
        onStyleReload?.(mapRef.current!);
      });
    } catch (e) {
      onError?.((e as Error).message || 'Failed to initialize map');
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onMapReady, onMoveEnd, onError, onStyleReload]);

  function toggleTerrain() {
    if (!mapRef.current) return;
    setTerrain((t) => !t);
    const layer = mapRef.current.getLayer('hills');
    if (layer) {
      mapRef.current.setLayoutProperty('hills', 'visibility', terrain ? 'none' : 'visible');
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Search bar */}
      <div style={{ padding: '16px', zIndex: 50, backgroundColor: 'transparent' }}>
        <M3eSearchBar />
      </div>

      {/* Main flex row: nav-rail + map + controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
        {/* Nav Rail */}
        <M3eNavRail style={{ zIndex: 40 }}>
          {/* Nav rail content goes here */}
        </M3eNavRail>

        {/* Map canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

          {/* Top-right controls */}
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Mode selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px', backgroundColor: 'rgba(30,30,30,0.4)', borderRadius: 'var(--md-sys-shape-corner-large)', backdropFilter: 'blur(8px)' }}>
              <M3eSegmentedButton value={selectedMode} onChange={(e: any) => setSelectedMode(e.currentTarget.value)}>
                <M3eButtonSegment value="driving">Car</M3eButtonSegment>
                <M3eButtonSegment value="transit">Transit</M3eButtonSegment>
                <M3eButtonSegment value="walking">Walk</M3eButtonSegment>
              </M3eSegmentedButton>
            </div>

            {/* Toggles for terrain and basemap */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px', backgroundColor: 'rgba(30,30,30,0.4)', borderRadius: 'var(--md-sys-shape-corner-large)', backdropFilter: 'blur(8px)' }}>
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

          {/* FAB Menu at bottom-right */}
          <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 20 }}>
            <M3eFab variant="primary" size="large">
              <M3eFabMenuTrigger htmlFor="fabmenu" />
            </M3eFab>
            <M3eFabMenu id="fabmenu" variant="primary">
              <M3eFabMenuItem>Add Business</M3eFabMenuItem>
              <M3eFabMenuItem>Add Location</M3eFabMenuItem>
              <M3eFabMenuItem>Report Issue</M3eFabMenuItem>
            </M3eFabMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
