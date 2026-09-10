/**
 * Improved Map Container
 * Handles caching, offline support, and optimized rendering
 */

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { initMapCache, getCacheStats } from '../lib/mapCache';
import { getMapViewState, saveMapViewState } from '../lib/storage';
import L from 'leaflet';

interface MapContainerImprovedProps {
  children?: React.ReactNode;
  defaultZoom?: number;
  defaultCenter?: [number, number];
}

const MapCacheHandler: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    // Initialize cache on mount
    initMapCache().catch((e) => console.error('Cache init failed:', e));

    // Save view state on interaction
    const handleMove = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      saveMapViewState({
        zoom,
        center: [center.lat, center.lng],
      });
    };

    map.on('moveend', handleMove);
    return () => {
      map.off('moveend', handleMove);
    };
  }, [map]);

  return null;
};

export const MapContainerImproved: React.FC<MapContainerImprovedProps> = ({
  children,
  defaultZoom = 12,
  defaultCenter = [60.4, 5.3], // Bergen center
}) => {
  const [cacheStats, setCacheStats] = useState({ routes: 0, pois: 0 });
  const [savedState, setSavedState] = useState<any>(null);

  useEffect(() => {
    // Load saved view state
    const state = getMapViewState();
    setSavedState(state);

    // Get cache stats
    getCacheStats()
      .then(setCacheStats)
      .catch((e) => console.error('Cache stats failed:', e));
  }, []);

  const center = savedState?.center || defaultCenter;
  const zoom = savedState?.zoom || defaultZoom;

  return (
    <div className="relative w-full h-screen bg-gray-100">
      <MapContainer
        center={center as L.LatLngExpression}
        zoom={zoom}
        className="w-full h-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          url="https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/{lng},{lat},{zoom},0,0/600x400@2x?access_token=pk.eyJ1IjoibG9ic3RlcmJzIiwiYSI6ImNsczRweHQybjAxaDYycWtndWo0dWMyMWoifQ.XQ3-N7gZ4Q3dF8j8qPLYjA"
          attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
        />
        <MapCacheHandler />
        {children}
      </MapContainer>

      {/* Cache stats indicator */}
      {(cacheStats.routes > 0 || cacheStats.pois > 0) && (
        <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full z-10">
          💾 Cached: {cacheStats.routes} routes, {cacheStats.pois} POIs
        </div>
      )}
    </div>
  );
};

export default MapContainerImproved;
