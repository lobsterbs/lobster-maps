import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { animated, useTransition } from '@react-spring/web';
import { geocodeAddress, submitBusiness, type GeocodeResult } from '../lib/api';
import { WavyLinearProgress } from './WavyLinearProgress';

type Step = 'location' | 'details';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  mapCenter: [number, number]; // [lng, lat] fallback pin
};

export function AddBusinessModal({ open, onClose, onCreated, mapCenter }: Props) {
  const [step, setStep] = useState<Step>('location');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [picked, setPicked] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [form, setForm] = useState({ name: '', category: '', description: '', phone: '', website: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const transition = useTransition(open, {
    from: { opacity: 0, transform: 'translateY(24px) scale(0.96)' },
    enter: { opacity: 1, transform: 'translateY(0px) scale(1)' },
    leave: { opacity: 0, transform: 'translateY(24px) scale(0.96)' },
    config: { tension: 280, friction: 24 },
  });

  useEffect(() => {
    if (open) return;
    setStep('location');
    setQuery('');
    setResults([]);
    setPicked(null);
    setForm({ name: '', category: '', description: '', phone: '', website: '' });
    setError(null);
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await geocodeAddress(query));
      } catch {
        setResults([]);
      }
    }, 400); // debounced so we don't hammer the geocode proxy on every keystroke
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function handleSubmit() {
    if (!picked) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitBusiness({
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        address: picked.label,
        latitude: picked.lat,
        longitude: picked.lon,
        phone: form.phone || undefined,
        website: form.website || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return transition(
    (style, item) =>
      item && (
        <animated.div
          style={{
            ...style,
            position: 'absolute',
            bottom: 24,
            left: '50%',
            marginLeft: -170,
            width: 340,
            maxHeight: '70vh',
            overflowY: 'auto',
            background: 'rgba(21, 21, 21, 0.78)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: 20,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {step === 'location' && (
            <>
              <h3 style={{ marginTop: 0 }}>Where&apos;s the business?</h3>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search an address..."
                style={inputStyle}
              />
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {results.map((r) => (
                  <button
                    key={`${r.lat}-${r.lon}`}
                    onClick={() => {
                      setPicked({ lat: parseFloat(r.lat), lon: parseFloat(r.lon), label: r.display_name });
                      setStep('details');
                    }}
                    style={resultStyle}
                  >
                    {r.display_name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setPicked({ lat: mapCenter[1], lon: mapCenter[0], label: 'Dropped pin (map center)' });
                  setStep('details');
                }}
                style={{ ...resultStyle, marginTop: 8, color: 'var(--lobster-gold)' }}
              >
                Use current map center instead →
              </button>
              <button onClick={onClose} style={cancelStyle}>
                Cancel
              </button>
            </>
          )}

          {step === 'details' && picked && (
            <>
              <h3 style={{ marginTop: 0 }}>Tell us about it</h3>
              <p style={{ fontSize: 13, color: 'var(--lobster-text-dim)', marginTop: -8 }}>{picked.label}</p>
              <input
                placeholder="Business name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Category (e.g. Cafe, Bookstore)"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={inputStyle}
              />
              <textarea
                placeholder="Short description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              />
              <input
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Website (optional)"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                style={inputStyle}
              />
              {error && <p style={{ color: 'var(--lobster-red)', fontSize: 13 }}>{error}</p>}
              {submitting && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 4px' }}>
                  <WavyLinearProgress width={296} height={14} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => setStep('location')} style={cancelStyle} disabled={submitting}>
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.name || !form.category || submitting}
                  style={submitStyle}
                >
                  {submitting ? 'Adding…' : 'Add business'}
                </button>
              </div>
            </>
          )}
        </animated.div>
      )
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  marginTop: 8,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#0f0f0f',
  color: 'var(--lobster-text)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
};

const resultStyle: CSSProperties = {
  textAlign: 'left',
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent',
  color: 'var(--lobster-text)',
  cursor: 'pointer',
  fontSize: 13,
};

const cancelStyle: CSSProperties = {
  marginTop: 12,
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'transparent',
  color: 'var(--lobster-text-dim)',
  cursor: 'pointer',
};

const submitStyle: CSSProperties = {
  flex: 1,
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--lobster-red)',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
};
