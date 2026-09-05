import { useState } from 'react';
import type { CSSProperties } from 'react';
import { animated, useTransition } from '@react-spring/web';
import { Car, Bus, Footprints, ArrowUpDown, X, Navigation, Loader2 } from 'lucide-react';
import { geocodeAddress, type GeocodeResult } from '../lib/api';
import { getRoute, formatDistance, formatDuration } from '../lib/routing';
import { getTransitTrip, modeIcon, type TransitTrip } from '../lib/transit';

export type TripPlace = { label: string; lat: number; lon: number } | 'current-location';
export type TripMode = 'driving' | 'transit' | 'walking';

type Props = {
  open: boolean;
  initialTo: TripPlace | null;
  onClose: () => void;
  onRouteFound: (geometry: [number, number][] | null, destination: { lat: number; lon: number }) => void;
};

export function TripPlanner({ open, initialTo, onClose, onRouteFound }: Props) {
  const [from, setFrom] = useState<TripPlace>('current-location');
  const [to, setTo] = useState<TripPlace | null>(initialTo);
  const [mode, setMode] = useState<TripMode>('driving');
  const [editingField, setEditingField] = useState<'from' | 'to' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drivingResult, setDrivingResult] = useState<{ distanceMeters: number; durationSeconds: number } | null>(null);
  const [transitResult, setTransitResult] = useState<TransitTrip | null>(null);

  // initialTo changes (a new business or search result got picked)
  // while the planner's already open — sync it in rather than only
  // reading it once on mount.
  if (initialTo && JSON.stringify(initialTo) !== JSON.stringify(to) && editingField === null) {
    setTo(initialTo);
    setDrivingResult(null);
    setTransitResult(null);
  }

  const transition = useTransition(open, {
    from: { opacity: 0, transform: 'translateY(24px) scale(0.97)' },
    enter: { opacity: 1, transform: 'translateY(0px) scale(1)' },
    leave: { opacity: 0, transform: 'translateY(24px) scale(0.97)' },
    config: { tension: 300, friction: 26 },
  });

  async function resolveCoords(place: TripPlace): Promise<{ lat: number; lon: number } | null> {
    if (place === 'current-location') {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          setError('Location access is not available in this browser.');
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => {
            setError('Could not get your location — check location permissions.');
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10_000 }
        );
      });
    }
    return { lat: place.lat, lon: place.lon };
  }

  async function handleGo() {
    if (!to) return;
    setError(null);
    setLoading(true);
    setDrivingResult(null);
    setTransitResult(null);
    onRouteFound(null, { lat: 0, lon: 0 }); // (0,0) is a deliberate "just clear, don't fly anywhere" sentinel — see handleRouteFound in App.tsx

    const fromCoords = await resolveCoords(from);
    const toCoords = await resolveCoords(to);
    if (!fromCoords || !toCoords) {
      setLoading(false);
      return;
    }

    try {
      if (mode === 'transit') {
        const trip = await getTransitTrip(fromCoords, toCoords);
        if (!trip) {
          setError('No transit route found for this trip.');
          setLoading(false);
          return;
        }
        setTransitResult(trip);
        onRouteFound(null, toCoords); // transit query doesn't return line geometry, see lib/transit.ts
      } else {
        const profile = mode === 'walking' ? 'foot-walking' : 'driving-car';
        const route = await getRoute([fromCoords.lon, fromCoords.lat], [toCoords.lon, toCoords.lat], profile);
        if (!route) {
          setError('No route found for this trip.');
          setLoading(false);
          return;
        }
        setDrivingResult({ distanceMeters: route.distanceMeters, durationSeconds: route.durationSeconds });
        onRouteFound(route.coordinates, toCoords);
      }
    } catch (err) {
      console.error('Trip planning failed:', err);
      setError('Could not find a route for this trip.');
    } finally {
      setLoading(false);
    }
  }

  function handleSwap() {
    if (!to) return;
    const oldFrom = from;
    setFrom(to);
    setTo(oldFrom === 'current-location' ? null : oldFrom);
    setDrivingResult(null);
    setTransitResult(null);
  }

  async function runFieldSearch(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchResults(await geocodeAddress(query));
    } catch {
      setSearchResults([]);
    }
  }

  function pickFieldResult(result: GeocodeResult) {
    const place: TripPlace = { label: result.display_name, lat: parseFloat(result.lat), lon: parseFloat(result.lon) };
    if (editingField === 'from') setFrom(place);
    if (editingField === 'to') setTo(place);
    setEditingField(null);
    setSearchQuery('');
    setSearchResults([]);
    setDrivingResult(null);
    setTransitResult(null);
  }

  function placeLabel(place: TripPlace | null): string {
    if (!place) return 'Choose destination';
    if (place === 'current-location') return 'Current Location';
    return place.label;
  }

  function handleClose() {
    setEditingField(null);
    setSearchQuery('');
    setSearchResults([]);
    setDrivingResult(null);
    setTransitResult(null);
    setError(null);
    onClose();
  }

  return transition(
    (style, item) =>
      item && (
        <animated.div style={{ ...style, ...panelStyle }}>
          <button onClick={handleClose} style={closeButtonStyle} aria-label="Close trip planner">
            <X size={18} />
          </button>

          <h3 style={{ margin: '0 0 12px', fontFamily: 'var(--font-heading)', fontSize: 17 }}>Directions</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button style={fieldButtonStyle} onClick={() => setEditingField(editingField === 'from' ? null : 'from')}>
                <Navigation size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                <span style={fieldTextStyle}>{placeLabel(from)}</span>
              </button>
              <button style={{ ...fieldButtonStyle, marginTop: 6 }} onClick={() => setEditingField(editingField === 'to' ? null : 'to')}>
                <span style={{ width: 14, flexShrink: 0, textAlign: 'center', opacity: 0.6 }}>•</span>
                <span style={fieldTextStyle}>{placeLabel(to)}</span>
              </button>
            </div>
            <button onClick={handleSwap} style={swapButtonStyle} aria-label="Swap from and to" disabled={!to}>
              <ArrowUpDown size={16} />
            </button>
          </div>

          {editingField && (
            <div style={{ marginTop: 8 }}>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => runFieldSearch(e.target.value)}
                placeholder={`Search for ${editingField === 'from' ? 'a starting point' : 'a destination'}...`}
                style={searchInputStyle}
              />
              {editingField === 'from' && (
                <button
                  onClick={() => { setFrom('current-location'); setEditingField(null); setSearchQuery(''); setSearchResults([]); }}
                  style={{ ...searchResultStyle, color: 'var(--lobster-gold)' }}
                >
                  <Navigation size={13} style={{ marginRight: 6 }} />
                  Use current location
                </button>
              )}
              {searchResults.map((r) => (
                <button key={`${r.lat}-${r.lon}`} onClick={() => pickFieldResult(r)} style={searchResultStyle}>
                  {r.display_name}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {(['driving', 'transit', 'walking'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setDrivingResult(null); setTransitResult(null); }}
                style={{ ...modeButtonStyle, ...(mode === m ? modeButtonActiveStyle : {}) }}
                aria-pressed={mode === m}
              >
                {m === 'driving' && <Car size={16} />}
                {m === 'transit' && <Bus size={16} />}
                {m === 'walking' && <Footprints size={16} />}
              </button>
            ))}
          </div>

          <button onClick={handleGo} disabled={!to || loading} style={goButtonStyle}>
            {loading ? <Loader2 size={16} className="lobster-spin" /> : 'Get Directions'}
          </button>

          {error && <p style={{ color: 'var(--lobster-red)', fontSize: 13, marginTop: 10 }}>{error}</p>}

          {drivingResult && (
            <div style={resultBoxStyle}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                {formatDuration(drivingResult.durationSeconds)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--lobster-text-dim)' }}>
                {formatDistance(drivingResult.distanceMeters)}
              </div>
            </div>
          )}

          {transitResult && (
            <div style={resultBoxStyle}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-heading)', marginBottom: 6 }}>
                {formatDuration(transitResult.durationSeconds)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                {transitResult.legs.map((leg, i) => {
                  const LegIcon = modeIcon(leg.mode);
                  return (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, color: 'var(--lobster-text-dim)' }}>
                      <LegIcon size={13} />
                      {leg.lineName && <span style={{ marginLeft: 3 }}>{leg.lineName}</span>}
                      {i < transitResult.legs.length - 1 && <span style={{ margin: '0 4px' }}>→</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </animated.div>
      )
  );
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  right: 16,
  maxWidth: 420,
  zIndex: 10,
  padding: 20,
  borderRadius: 20,
  background: 'rgba(21, 21, 21, 0.9)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  color: 'var(--lobster-text)',
  fontFamily: 'var(--font-body)',
};

const closeButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 14,
  right: 14,
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.08)',
  color: 'var(--lobster-text)',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
};

const fieldButtonStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: '#0f0f0f',
  color: 'var(--lobster-text)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  cursor: 'pointer',
  textAlign: 'left',
};

const fieldTextStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const swapButtonStyle: CSSProperties = {
  flexShrink: 0,
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--lobster-text)',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
};

const searchInputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#0f0f0f',
  color: 'var(--lobster-text)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  marginBottom: 4,
};

const searchResultStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  textAlign: 'left',
  padding: '8px 10px',
  border: 'none',
  background: 'transparent',
  color: 'var(--lobster-text)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const modeButtonStyle: CSSProperties = {
  flex: 1,
  padding: '10px 0',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--lobster-text-dim)',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  transition: 'background 0.2s var(--ease-elastic), color 0.2s var(--ease-elastic)',
};

const modeButtonActiveStyle: CSSProperties = {
  background: 'var(--lobster-red)',
  color: 'white',
  border: '1px solid transparent',
};

const goButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: 12,
  padding: '11px 0',
  borderRadius: 10,
  border: 'none',
  background: 'var(--lobster-gold)',
  color: '#0a0a0a',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const resultBoxStyle: CSSProperties = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: '1px solid rgba(255,255,255,0.08)',
};
