import type { CSSProperties } from 'react';
import { animated, useTransition } from '@react-spring/web';
import { formatDistance, formatDuration } from '../lib/routing';

type Props = {
  route: { distanceMeters: number; durationSeconds: number; destinationAddress: string } | null;
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
          {loading && <span style={{ color: 'var(--lobster-text-dim)', fontSize: 13 }}>Finding route…</span>}
          {error && <span style={{ color: 'var(--lobster-red)', fontSize: 13 }}>{error}</span>}
          {route && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  {formatDuration(route.durationSeconds)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--lobster-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatDistance(route.distanceMeters)} · to {route.destinationAddress}
                </div>
              </div>
            </div>
          )}
          <button onClick={onClear} style={closeButtonStyle} aria-label="Clear route">
            ×
          </button>
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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
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
