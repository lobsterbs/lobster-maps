import { useCallback, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import { createRoot } from 'react-dom/client';
import Supercluster from 'supercluster';
import { MapCanvas } from './components/Map';
import { AddBusinessFAB } from './components/AddBusinessFAB';
import { AddBusinessModal } from './components/AddBusinessModal';
import { BusinessMarker } from './components/BusinessMarker';
import { ClusterMarker } from './components/ClusterMarker';
import { BusinessDetailSheet } from './components/BusinessDetailSheet';
import { LoadingMorph } from './components/LoadingMorph';
import { SearchBar } from './components/SearchBar';
import { fetchBusinessesInView, type Business } from './lib/api';

type BusinessPointProps = {
  businessId: string;
  name: string;
  category: string;
  verified: boolean;
};

export default function App() {
  const mapRef = useRef<MapLibreMap | null>(null);
  const businessMarkersRef = useRef(new Map<string, maplibregl.Marker>());
  const clusterMarkersRef = useRef<maplibregl.Marker[]>([]);
  const businessLookupRef = useRef(new Map<string, Business>());
  const [modalOpen, setModalOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [center, setCenter] = useState<[number, number]>([-73.9857, 40.7484]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const syncMarkers = useCallback(async (bounds: [number, number, number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    let items: Business[] = [];
    try {
      items = await fetchBusinessesInView(bounds);
    } catch (err) {
      console.error('Failed to load businesses in view:', err);
      return;
    }

    businessLookupRef.current = new Map(items.map((b) => [b.id, b]));

    // Rebuilt on every sync — cheap at hobby scale (supercluster is built
    // to handle millions of points; this is hundreds), and simpler than
    // maintaining a persistent index across pans/zooms.
    const index = new Supercluster<BusinessPointProps>({ radius: 50, maxZoom: 16 }).load(
      items.map((b) => ({
        type: 'Feature',
        properties: { businessId: b.id, name: b.name, category: b.category, verified: b.verified },
        geometry: { type: 'Point', coordinates: [b.longitude, b.latitude] },
      }))
    );

    const zoom = Math.round(map.getZoom());
    const clusters = index.getClusters(bounds, zoom);

    // Clusters have no stable identity across rebuilds (a fresh index is
    // built every sync), so they're fully torn down and re-added each
    // time rather than diffed like individual business markers below.
    for (const m of clusterMarkersRef.current) m.remove();
    clusterMarkersRef.current = [];

    const seenBusinessIds = new Set<string>();

    for (const feature of clusters) {
      const [lng, lat] = feature.geometry.coordinates;

      if ('cluster' in feature.properties) {
        const { point_count: count, cluster_id: clusterId } = feature.properties;
        const el = document.createElement('div');
        createRoot(el).render(
          <ClusterMarker
            count={count}
            onClick={() => {
              const expansionZoom = Math.min(index.getClusterExpansionZoom(clusterId), 18);
              map.easeTo({ center: [lng, lat], zoom: expansionZoom, duration: 500 });
            }}
          />
        );
        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        clusterMarkersRef.current.push(marker);
        continue;
      }

      const { businessId, name, verified } = feature.properties;
      seenBusinessIds.add(businessId);
      if (businessMarkersRef.current.has(businessId)) continue;

      const el = document.createElement('div');
      createRoot(el).render(
        <BusinessMarker
          name={name}
          verified={verified}
          onClick={() => {
            const biz = businessLookupRef.current.get(businessId);
            if (biz) setSelectedBusiness(biz);
          }}
        />
      );
      const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      businessMarkersRef.current.set(businessId, marker);
    }

    for (const [id, marker] of businessMarkersRef.current) {
      if (!seenBusinessIds.has(id)) {
        marker.remove();
        businessMarkersRef.current.delete(id);
      }
    }
  }, []);

  const handleMapReady = useCallback(
    (map: MapLibreMap) => {
      mapRef.current = map;
      setMapLoaded(true);
      const b = map.getBounds();
      syncMarkers([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    },
    [syncMarkers]
  );

  const handleMoveEnd = useCallback(
    (bounds: [number, number, number, number]) => {
      setCenter([(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2]);
      syncMarkers(bounds);
    },
    [syncMarkers]
  );

  const handleCreated = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    syncMarkers([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
  }, [syncMarkers]);

  const handleSearchSelect = useCallback((lat: number, lon: number) => {
    mapRef.current?.flyTo({ center: [lon, lat], zoom: 15, essential: true });
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <MapCanvas onMapReady={handleMapReady} onMoveEnd={handleMoveEnd} />
      {!mapLoaded && <LoadingMorph />}
      <SearchBar onSelect={handleSearchSelect} />
      <AddBusinessFAB onClick={() => setModalOpen(true)} />
      <AddBusinessModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        mapCenter={center}
      />
      <BusinessDetailSheet business={selectedBusiness} onClose={() => setSelectedBusiness(null)} />
    </div>
  );
}
