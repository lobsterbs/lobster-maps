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
import { Snackbar } from './components/Snackbar';
import { StreetViewLayer } from './components/StreetViewLayer';
import { CategoryFilterChips } from './components/CategoryFilterChips';
import { TripPlanner, type TripPlace } from './components/TripPlanner';
import { fetchBusinessesInView, type Business } from './lib/api';

const ROUTE_SOURCE_ID = 'lobster-route';
const ROUTE_LAYER_ID = 'lobster-route-line';

function drawRouteOnMap(map: MapLibreMap, coordinates: [number, number][]) {
  const geojson = {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates },
  };
  const existing = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(geojson);
  } else {
    map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: geojson });
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#d4a574', 'line-width': 5, 'line-opacity': 0.9 },
    });
  }
}

// Best-effort: if the map's style got swapped (Map/Satellite toggle)
// since the route was drawn, the source/layer are already gone, this
// just avoids throwing on a getLayer/getSource call against a stale id.
function clearRouteFromMap(map: MapLibreMap | null) {
  if (!map) return;
  if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
  if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
}

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
  const lastItemsRef = useRef<Business[]>([]); // raw, unfiltered — lets category toggles re-render without a fresh fetch
  const [modalOpen, setModalOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>([-73.9857, 40.7484]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const selectedCategoryRef = useRef<string | null>(null); // mirrors selectedCategory — see note on syncMarkers below
  const [tripPlannerOpen, setTripPlannerOpen] = useState(false);
  const [tripPlannerTo, setTripPlannerTo] = useState<TripPlace | null>(null);

  // renderMarkers is the shared second half of syncMarkers below —
  // clustering + marker diffing against whatever's currently in
  // lastItemsRef, filtered by the active category. Pulled out so a
  // category toggle can re-render instantly against already-fetched
  // data instead of hitting the network again.
  const renderMarkers = useCallback((categoryFilter: string | null) => {
    const map = mapRef.current;
    if (!map) return;

    const items = categoryFilter
      ? lastItemsRef.current.filter((b) => b.category === categoryFilter)
      : lastItemsRef.current;

    businessLookupRef.current = new Map(items.map((b) => [b.id, b]));

    const index = new Supercluster<BusinessPointProps>({ radius: 50, maxZoom: 16 }).load(
      items.map((b) => ({
        type: 'Feature',
        properties: { businessId: b.id, name: b.name, category: b.category, verified: b.verified },
        geometry: { type: 'Point', coordinates: [b.longitude, b.latitude] },
      }))
    );

    const bounds = map.getBounds();
    const bbox: [number, number, number, number] = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    const zoom = Math.round(map.getZoom());
    const clusters = index.getClusters(bbox, zoom);

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

    lastItemsRef.current = items;
    setAvailableCategories([...new Set(items.map((b) => b.category))].sort());
    renderMarkers(selectedCategoryRef.current);
  }, [renderMarkers]);

  const handleMapReady = useCallback(
    (map: MapLibreMap) => {
      mapRef.current = map;
      setMapLoaded(true);
      const b = map.getBounds();
      syncMarkers([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    },
    [syncMarkers]
  );

  const handleMapError = useCallback((message: string) => {
    setMapError(message);
  }, []);

  const handleMoveEnd = useCallback(
    (bounds: [number, number, number, number]) => {
      setCenter([(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2]);
      syncMarkers(bounds);
    },
    [syncMarkers]
  );

  const handleCreated = useCallback(
    (name: string) => {
      const map = mapRef.current;
      if (map) {
        const b = map.getBounds();
        syncMarkers([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      }
      setSnackbarMessage(`${name} added`);
    },
    [syncMarkers]
  );

  const handleSearchSelect = useCallback((lat: number, lon: number, label: string) => {
    mapRef.current?.flyTo({ center: [lon, lat], zoom: 15, essential: true });
    setTripPlannerTo({ label, lat, lon });
    setTripPlannerOpen(true);
  }, []);

  const handleOpenDirections = useCallback((business: Business) => {
    setSelectedBusiness(null); // close the detail sheet so the planner is visible
    setTripPlannerTo({ label: business.name, lat: business.latitude, lon: business.longitude });
    setTripPlannerOpen(true);
  }, []);

  const handleRouteFound = useCallback((geometry: [number, number][] | null, destination: { lat: number; lon: number }) => {
    const map = mapRef.current;
    if (!map) return;
    if (!geometry) {
      // (0,0) is TripPlanner's deliberate "just clear, don't fly" sentinel, not a real destination
      clearRouteFromMap(map);
      if (destination.lat !== 0 || destination.lon !== 0) {
        // transit result — no line geometry to fit to, just center on the destination
        map.flyTo({ center: [destination.lon, destination.lat], zoom: 14, duration: 500 });
      }
      return;
    }
    drawRouteOnMap(map, geometry);
    const bounds = geometry.reduce(
      (b, coord) => b.extend(coord),
      new maplibregl.LngLatBounds(geometry[0], geometry[0])
    );
    map.fitBounds(bounds, { padding: 64, duration: 500 });
  }, []);

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      setSelectedCategory(category);
      selectedCategoryRef.current = category;
      renderMarkers(category);
    },
    [renderMarkers]
  );

  const handleSnackbarDismiss = useCallback(() => {
    setSnackbarMessage(null);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <MapCanvas onMapReady={handleMapReady} onMoveEnd={handleMoveEnd} onError={handleMapError} />
      {!mapLoaded && !mapError && <LoadingMorph />}
      {mapError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'var(--lobster-bg)',
            color: 'var(--lobster-text)',
            fontFamily: 'var(--font-body)',
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>
            Map didn&apos;t load
          </div>
          <div style={{ color: 'var(--lobster-text-dim)', fontSize: 14, maxWidth: 360 }}>
            {mapError}
          </div>
        </div>
      )}
      {!tripPlannerOpen && <SearchBar onSelect={handleSearchSelect} />}
      {!tripPlannerOpen && (
        <CategoryFilterChips categories={availableCategories} selected={selectedCategory} onSelect={handleCategorySelect} />
      )}
      <StreetViewLayer map={mapLoaded ? mapRef.current : null} />
      <TripPlanner
        open={tripPlannerOpen}
        initialTo={tripPlannerTo}
        onClose={() => { setTripPlannerOpen(false); clearRouteFromMap(mapRef.current); }}
        onRouteFound={handleRouteFound}
      />
      <AddBusinessFAB onClick={() => setModalOpen(true)} />
      <AddBusinessModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        mapCenter={center}
      />
      <BusinessDetailSheet
        business={selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
        onGetDirections={handleOpenDirections}
      />
      <Snackbar message={snackbarMessage} onDismiss={handleSnackbarDismiss} />
    </div>
  );
}
