import type { CSSProperties } from 'react';
import { animated, useTransition } from '@react-spring/web';
import { formatDistance, formatDuration } from '../lib/routing';
import { modeEmoji, type TransitTrip } from '../lib/transit';

export type RouteResult =
  | { mode: 'driving'; distanceMeters: number; durationSeconds: number; destinationAddress: string }
  | { mode: 'transit'; trip: TransitTrip; destinationAddress: string };

type Props = {
  route: RouteResult | null;
  loading: boolean;
  error: string | null;
  onClear: () => void;
};

export function RouteInfoCard({ route, loading, error, onClear }: Props) {
  const show = loading || !!route || !!error;
  const transition = useTransition(show, {
    from: { opacity: 0, transform: 'translateY(-8px)' },
    enter: { opacity: 1, transform: 'translateY(0px)' },
    leave: { opacity: 0, transform: 'translateY(-8px)' },
    config: { tension: 300, friction: 26 },
  });

  return transition(
    (style, item) =>
      item && (
        <animated.div style={{ ...style, ...cardStyle }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {loading && <span style={{ color: 'var(--lobster-text-dim)', fontSize: 13 }}>Finding route…</span>}
              {error && <span style={{ color: 'var(--lobster-red)', fontSize: 13 }}>{error}</span>}

              {route?.mode === 'driving' && !loading && (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                    {formatDuration(route.durationSeconds)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--lobster-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🚗 {formatDistance(route.distanceMeters)} · to {route.destinationAddress}
                  </div>
                </>
              )}

              {route?.mode === 'transit' && !loading && (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                    {formatDuration(route.trip.durationSeconds)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {route.trip.legs.map((leg, i) => (
                      <span key={i} style={legChipStyle}>
                        {modeEmoji(leg.mode)}
                        {leg.lineName && <span style={{ marginLeft: 3 }}>{leg.lineName}</span>}
                        {i < route.trip.legs.length - 1 && <span style={{ margin: '0 2px', color: 'var(--lobster-text-dim)' }}>→</span>}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={onClear} style={closeButtonStyle} aria-label="Clear route">
              ×
            </button>
          </div>
        </animated.div>
      )
  );
}

const cardStyle: CSSProperties = {
  position: 'absolute',
  top: 80,
  left: 16,
  right: 16,
  maxWidth: 420,
  zIndex: 6,
  padding: '12px 16px',
  borderRadius: 16,
  background: 'rgba(21, 21, 21, 0.85)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  color: 'var(--lobster-text)',
  fontFamily: 'var(--font-body)',
};

const legChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: 12,
  color: 'var(--lobster-text-dim)',
};

const closeButtonStyle: CSSProperties = {
  flexShrink: 0,
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.08)',
  color: 'var(--lobster-text)',
  fontSize: 16,
  lineHeight: 1,
  cursor: 'pointer',
};
