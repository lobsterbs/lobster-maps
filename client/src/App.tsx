import { useCallback, useRef, useState, useEffect } from 'react';
import * as maplibregl from 'maplibre-gl';
import { type Map as MapLibreMap } from 'maplibre-gl';
import { createRoot } from 'react-dom/client';
import { M3eTheme } from '@m3e/react/theme';
import Supercluster from 'supercluster';
import { MapCanvas } from './components/Map';
import { AddBusinessFAB } from './components/AddBusinessFAB';
import { AddBusinessModal } from './components/AddBusinessModal';
import { BusinessMarker } from './components/BusinessMarker';
import { ClusterMarker } from './components/ClusterMarker';
import { BusinessDetailSheet } from './components/BusinessDetailSheet';
import { LoadingMorph } from './components/LoadingMorph';
import SearchBarEnhanced from './components/SearchBarEnhanced';
import PlaceDetailSheet from './components/PlaceDetailSheet';
import DirectionsPanel from './components/DirectionsPanel';
import { Snackbar } from './components/Snackbar';
import { StreetViewLayer } from './components/StreetViewLayer';
import { TripPlanner, type TripPlace } from './components/TripPlanner';
import { fetchBusinessesInView, type Business } from './lib/api';
import { initMapCache, getCachedPOIs, cachePOIs, getCachedRoute, cacheRoute } from './lib/mapCache';
import { addRecentDestination, getMapViewState, saveMapViewState } from './lib/storage';
import { setupLazyLoading } from './lib/lazyLoadBusinesses';

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
      paint: { 'line-color': getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-street-wood').trim(), 'line-width': 5, 'line-opacity': 0.9 },
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
  // setStyle() destroys every source and layer, so the route has to be
  // redrawn after a basemap switch. Keeping the geometry here is the
  // only way to do that without re-requesting the route.
  const lastRouteRef = useRef<[number, number][] | null>(null);
  const businessMarkersRef = useRef(new Map<string, maplibregl.Marker>());
  const clusterMarkersRef = useRef<maplibregl.Marker[]>([]);
  const businessLookupRef = useRef(new Map<string, Business>());
  const lastItemsRef = useRef<Business[]>([]); // raw, unfiltered — lets category toggles re-render without a fresh fetch
  const [modalOpen, setModalOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>([5.3221, 60.3913]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const selectedCategoryRef = useRef<string | null>(null); // mirrors selectedCategory — see note on syncMarkers below
  const [tripPlannerOpen, setTripPlannerOpen] = useState(false);
  const [tripPlannerTo, setTripPlannerTo] = useState<TripPlace | null>(null);
  const cacheInitializedRef = useRef(false);

  // Initialize map cache and restore view state on mount
  useEffect(() => {
    console.log('App mounted');
    if (!cacheInitializedRef.current) {
      initMapCache().catch((e) => console.error('Cache init failed:', e));
      cacheInitializedRef.current = true;

      // Restore previous map view if available (within 24hrs)
      const savedState = getMapViewState();
      if (savedState) {
        setCenter(savedState.center);
      }
    }
  }, []);

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

    for (const m of clusterMarkersRef.current) {
      const el = m.getElement() as any;
      if (el._reactRoot) {
        try { el._reactRoot.unmount(); } catch {}
      }
      m.remove();
    }
    clusterMarkersRef.current = [];

    const seenBusinessIds = new Set<string>();

    for (const feature of clusters) {
      const [lng, lat] = feature.geometry.coordinates;

      if ('cluster' in feature.properties) {
        const { point_count: count, cluster_id: clusterId } = feature.properties;
        const el = document.createElement('div');
        const root = createRoot(el);
        (el as any)._reactRoot = root;
        root.render(
          <ClusterMarker
            count={count}
            onClick={() => {
              const expansionZoom = Math.min(index.getClusterExpansionZoom(clusterId), 18);
              map.easeTo({ center: [lng, lat], zoom: expansionZoom, duration: 500 });
            }}
          />
        );
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
        clusterMarkersRef.current.push(marker);
        continue;
      }

      const { businessId, name, verified } = feature.properties;
      seenBusinessIds.add(businessId);
      if (businessMarkersRef.current.has(businessId)) continue;

      const el = document.createElement('div');
      const root = createRoot(el);
      (el as any)._reactRoot = root;
      root.render(
        <BusinessMarker
          name={name}
          verified={verified}
          onClick={() => {
            const biz = businessLookupRef.current.get(businessId);
            if (biz) setSelectedBusiness(biz);
          }}
        />
      );
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
      businessMarkersRef.current.set(businessId, marker);
    }

    for (const [id, marker] of businessMarkersRef.current) {
      if (!seenBusinessIds.has(id)) {
        const el = marker.getElement() as any;
        if (el._reactRoot) {
          try { el._reactRoot.unmount(); } catch {}
        }
        marker.remove();
        businessMarkersRef.current.delete(id);
      }
    }
  }, []);

  const syncMarkers = useCallback(async (bounds: [number, number, number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    const centerLat = (bounds[1] + bounds[3]) / 2;
    const centerLon = (bounds[0] + bounds[2]) / 2;
    const radiusKm = 5; // cache radius

    let items: Business[] = [];
    
    // Try cache first
    try {
      const cached = await getCachedPOIs(centerLat, centerLon, radiusKm);
      if (cached && cached.length > 0) {
        items = cached as Business[];
      }
    } catch (e) {
      console.warn('Cache lookup failed:', e);
    }

    // If not cached, fetch from API
    if (items.length === 0) {
      try {
        items = await fetchBusinessesInView(bounds);
        // Cache the results
        if (items.length > 0) {
          cachePOIs(centerLat, centerLon, radiusKm, items).catch(e => 
            console.warn('Cache save failed:', e)
          );
        }
      } catch (err) {
        console.error('Failed to load businesses in view:', err);
        return;
      }
    }

    lastItemsRef.current = items;
    setAvailableCategories([...new Set(items.map((b) => b.category))].sort());
    renderMarkers(selectedCategoryRef.current);
  }, [renderMarkers]);

  const handleMapReady = useCallback(
    (map: MapLibreMap) => {
      console.log('Map ready', map);
      mapRef.current = map;
      setMapLoaded(true);
      const b = map.getBounds();
      syncMarkers([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    },
    [syncMarkers]
  );

  const handleMapError = useCallback((message: string) => {
    console.error('Map error:', message);
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
    // Track destination in recent destinations
    addRecentDestination({ name: label, lat, lon });
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

    // Cache the route
    if (geometry && geometry.length > 0) {
      const routeKey = `route_${geometry[0][0]}_${geometry[0][1]}_${destination.lat}_${destination.lon}`;
      const routeData = {
        geometry,
        destination,
        timestamp: Date.now(),
      };
      cacheRoute(routeKey, routeData).catch((e) =>
        console.warn('Route cache failed:', e)
      );
    }

    // Save map view state for next visit
    const center = map.getCenter();
    saveMapViewState({
      zoom: map.getZoom(),
      center: [center.lng, center.lat],
    });

    if (!geometry) {
      // (0,0) is TripPlanner's deliberate "just clear, don't fly" sentinel, not a real destination
      lastRouteRef.current = null;
      clearRouteFromMap(map);
      if (destination.lat !== 0 || destination.lon !== 0) {
        // transit result — no line geometry to fit to, just center on the destination
        map.flyTo({ center: [destination.lon, destination.lat], zoom: 14, duration: 500 });
      }
      return;
    }

    lastRouteRef.current = geometry;
    drawRouteOnMap(map, geometry);
    const bounds = geometry.reduce(
      (b, coord) => b.extend(coord),
      new maplibregl.LngLatBounds(geometry[0], geometry[0])
    );
    map.fitBounds(bounds, { padding: 64, duration: 500 });
  }, []);

  const handleStyleReload = useCallback((map: MapLibreMap) => {
    // Markers are DOM-backed maplibregl.Marker instances and survive a
    // style swap; GeoJSON sources do not.
    if (lastRouteRef.current) drawRouteOnMap(map, lastRouteRef.current);
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
    <M3eTheme>
      <div style={{ position: 'fixed', inset: 0 }}>
        <MapCanvas
        onMapReady={handleMapReady}
        onMoveEnd={handleMoveEnd}
        onError={handleMapError}
        onStyleReload={handleStyleReload}
      />
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
      {!tripPlannerOpen && (
        <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 10, width: 'calc(100% - 32px)', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SearchBarEnhanced
            onLocationSelect={(result: any) => {
              setSelectedPlace(result);
              if (result.lat && result.lon) {
                mapRef.current?.flyTo({ center: [result.lon, result.lat], zoom: 15 });
              }
            }}
          />
          {availableCategories.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 4,
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <button
                onClick={() => handleCategorySelect(null)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: selectedCategory === null ? 'var(--md-sys-color-primary)' : 'rgba(15,23,42,0.85)',
                  color: selectedCategory === null ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.15s ease',
                }}
              >
                All
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(selectedCategory === cat ? null : cat)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: selectedCategory === cat ? 'var(--md-sys-color-primary)' : 'rgba(15,23,42,0.85)',
                    color: selectedCategory === cat ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.15s ease',
                    textTransform: 'capitalize',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <StreetViewLayer map={mapLoaded ? mapRef.current : null} />
      <TripPlanner
        open={tripPlannerOpen}
        initialTo={tripPlannerTo}
        onClose={() => { setTripPlannerOpen(false); clearRouteFromMap(mapRef.current); }}
        onRouteFound={handleRouteFound}
      />
      <DirectionsPanel
        from="Current location"
        to={tripPlannerTo ? (typeof tripPlannerTo === 'string' ? tripPlannerTo : tripPlannerTo.label) : undefined}
        loading={false}
        routes={tripPlannerOpen ? [] : undefined}
        onSelect={() => {}}
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
      <PlaceDetailSheet
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
        onNavigate={(lat, lon, name) => {
          handleSearchSelect(lat, lon, name);
          setSelectedPlace(null);
        }}
      />
      <Snackbar message={snackbarMessage} onDismiss={handleSnackbarDismiss} />
      </div>
    </M3eTheme>
  );
}
