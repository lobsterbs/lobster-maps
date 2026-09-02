import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { animated, useTransition } from '@react-spring/web';
import { fetchBusinessById, type Business } from '../lib/api';
import { isRoutingConfigured } from '../lib/routing';

type Props = {
  business: Business | null;
  onClose: () => void;
  onGetDirections: (business: Business, mode: 'driving' | 'transit') => void;
};

// Business as passed in from a marker click only has the columns the
// bbox listing selects (see routes/businesses.ts) — no description,
// phone, website, or hours. Those get fetched here, on demand, via the
// /:id endpoint, which already existed server-side but wasn't called
// from anywhere in the frontend until now.
export function BusinessDetailSheet({ business, onClose, onGetDirections }: Props) {
  const [full, setFull] = useState<Business | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  useEffect(() => {
    if (!business) {
      setFull(null);
      return;
    }
    // Without this guard, clicking a second marker before the first
    // detail fetch resolves can let the stale response land after the
    // new one and silently overwrite it — the sheet would show one
    // business's name with a different business's phone/hours. Proved
    // it with a timing repro before adding this.
    let cancelled = false;
    setFull(null);
    setLoadingFull(true);
    fetchBusinessById(business.id)
      .then((data) => {
        if (!cancelled) setFull(data);
      })
      .catch(() => {
        if (!cancelled) setFull(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingFull(false);
      });
    return () => {
      cancelled = true;
    };
  }, [business]);

  const transition = useTransition(business, {
    from: { opacity: 0, transform: 'translateY(100%)' },
    enter: { opacity: 1, transform: 'translateY(0%)' },
    leave: { opacity: 0, transform: 'translateY(100%)' },
    config: { tension: 280, friction: 30 },
  });

  const backdropTransition = useTransition(!!business, {
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
  });

  return (
    <>
      {backdropTransition(
        (style, show) =>
          show && (
            <animated.div
              onClick={onClose}
              style={{ ...backdropStyle, opacity: style.opacity }}
            />
          )
      )}
      {transition(
        (style, biz) =>
          biz && (
            <animated.div
              style={{ ...sheetStyle, transform: style.transform, opacity: style.opacity }}
            >
              <div style={handleStyle} />
              
              {/* Image gallery if images exist */}
              {!loadingFull && full?.imageUrls && full.imageUrls.length > 0 && (
                <div style={imageGalleryStyle}>
                  <img 
                    src={full.imageUrls[0]} 
                    alt={biz.name}
                    style={imageStyle}
                    onError={(e) => {
                      // Hide broken images
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={titleStyle}>{biz.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ color: 'var(--lobster-text-dim)', fontSize: 13 }}>{biz.category}</span>
                    {biz.verified && <span style={verifiedBadgeStyle}>Verified</span>}
                  </div>
                </div>
                <button onClick={onClose} style={closeButtonStyle} aria-label="Close">
                  ×
                </button>
              </div>

              <div style={{ padding: '0 16px', marginTop: 8 }}>
                <p style={addressStyle}>{biz.address}</p>

                {loadingFull && <div style={skeletonBlockStyle} />}

                {!loadingFull && full?.description && <p style={descriptionStyle}>{full.description}</p>}

                {/* Contact & Actions — directions always shows once loaded, phone/website only if present */}
                {!loadingFull && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {full?.phone && (
                      <a href={`tel:${full.phone}`} style={linkRowStyle}>
                        <span style={{ marginRight: 8 }}>📞</span>
                        {full.phone}
                      </a>
                    )}
                    {full?.website && (
                      <a href={full.website} target="_blank" rel="noreferrer" style={linkRowStyle}>
                        <span style={{ marginRight: 8 }}>🌐</span>
                        {full.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {biz && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {isRoutingConfigured() ? (
                          <button
                            onClick={() => onGetDirections(biz, 'driving')}
                            style={{ ...linkRowStyle, ...directionsButtonStyle }}
                          >
                            🚗 Drive
                          </button>
                        ) : (
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(biz.address)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ ...linkRowStyle, ...directionsButtonStyle }}
                          >
                            🚗 Drive
                          </a>
                        )}
                        {/* Transit needs no API key at all (Entur, see lib/transit.ts), always available */}
                        <button
                          onClick={() => onGetDirections(biz, 'transit')}
                          style={{ ...linkRowStyle, ...directionsButtonStyle }}
                        >
                          🚌 Transit
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Hours of operation */}
                {!loadingFull && full?.hours && Object.keys(full.hours).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--lobster-text)', marginBottom: 8 }}>Hours</h3>
                    <div style={hoursGridStyle}>
                      {Object.entries(full.hours).map(([day, range]) => (
                        <div key={day} style={hoursRowStyle}>
                          <span style={{ color: 'var(--lobster-text-dim)', fontSize: 12, minWidth: 60 }}>{day}</span>
                          <span style={{ fontSize: 12 }}>{range}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ height: 16 }} />
            </animated.div>
          )
      )}
    </>
  );
}

const backdropStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 8,
};

const sheetStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 9,
  maxHeight: '62vh',
  overflowY: 'auto',
  background: 'rgba(21, 21, 21, 0.85)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  padding: '12px 0 0',
  boxShadow: '0 -8px 32px rgba(0,0,0,0.45)',
};

const handleStyle: CSSProperties = {
  width: 36,
  height: 4,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.2)',
  margin: '0 auto 12px',
};

const imageGalleryStyle: CSSProperties = {
  width: '100%',
  height: 180,
  overflow: 'hidden',
  background: '#0f0f0f', // shows while the image loads, and if it fails to load entirely
};

const imageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-heading)',
  fontSize: 20,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const verifiedBadgeStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--lobster-gold)',
  border: '1px solid var(--lobster-gold)',
  borderRadius: 999,
  padding: '1px 8px',
};

const closeButtonStyle: CSSProperties = {
  flexShrink: 0,
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.08)',
  color: 'var(--lobster-text)',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
};

const addressStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--lobster-text-dim)',
  marginTop: 12,
};

const descriptionStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  marginTop: 12,
};

const linkRowStyle: CSSProperties = {
  fontSize: 14,
  color: 'var(--lobster-gold)',
  textDecoration: 'none',
};

const directionsButtonStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '8px 14px',
  cursor: 'pointer',
  font: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const skeletonBlockStyle: CSSProperties = {
  height: 14,
  width: '70%',
  borderRadius: 6,
  marginTop: 12,
  background:
    'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 37%, rgba(255,255,255,0.06) 63%)',
  backgroundSize: '400% 100%',
  animation: 'lobster-skeleton-shimmer 1.4s ease infinite',
};

const hoursGridStyle: CSSProperties = {
  marginTop: 16,
  borderTop: '1px solid rgba(255,255,255,0.08)',
  paddingTop: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const hoursRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
};
