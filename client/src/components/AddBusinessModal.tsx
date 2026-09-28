import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { animated, useTransition } from '@react-spring/web';
import { geocodeAddress, submitBusiness, type GeocodeResult } from '../lib/api';
import { RippleContainer, useRipple } from './Ripple';
import { WavyLinearProgress } from './WavyLinearProgress';
import { M3eDialog } from '@m3e/react/dialog';
import { M3eHeading } from '@m3e/react/heading';
import { M3eButton } from '@m3e/react/button';
import { M3eFormField } from '@m3e/react/form-field';
import { M3eDivider } from '@m3e/react/divider';

type Step = 'location' | 'details';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
  mapCenter: [number, number]; // [lng, lat] fallback pin
};

export function AddBusinessModal({ open, onClose, onCreated, mapCenter }: Props) {
  const [step, setStep] = useState<Step>('location');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [picked, setPicked] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [form, setForm] = useState({ name: '', category: '', description: '', phone: '', website: '', imageUrl: '' });
  const submitRipple = useRipple();
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
    setForm({ name: '', category: '', description: '', phone: '', website: '', imageUrl: '' });
    setError(null);
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    // Same race as SearchBar.tsx: clearTimeout only cancels a timer
    // that hasn't fired yet, not a request already in flight. Guard
    // against a stale slower response overwriting a newer faster one.
    let cancelled = false;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await geocodeAddress(query);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 400); // debounced so we don't hammer the geocode proxy on every keystroke
    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
    };
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
        imageUrls: form.imageUrl ? [form.imageUrl] : undefined,
      });
      onCreated(form.name);
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
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 101,
            pointerEvents: open ? 'auto' : 'none',
          }}
        >
          {/* Scrim */}
          <animated.div
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.32)',
              zIndex: 0,
            }}
          />

          {/* M3E Dialog Container */}
          <M3eDialog
            open={open}
            onClosed={onClose}
            style={{
              zIndex: 1,
              '--md-dialog-container-max-width': '480px',
              '--md-dialog-container-inset-block-start': '24px',
            } as any}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
              {step === 'location' && (
                <>
                  <M3eHeading size="large">Where&apos;s the business?</M3eHeading>
                  <M3eFormField>
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search an address..."
                      style={inputStyle}
                    />
                  </M3eFormField>

                  {/* Results */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {results.map((r) => (
                      <M3eButton
                        key={`${r.lat}-${r.lon}`}
                        onClick={() => {
                          setPicked({ lat: parseFloat(r.lat), lon: parseFloat(r.lon), label: r.display_name });
                          setStep('details');
                        }}
                        variant="outlined"
                        style={{ textAlign: 'left', width: '100%' }}
                      >
                        {r.display_name}
                      </M3eButton>
                    ))}
                  </div>

                  {/* Fallback: Use map center */}
                  <M3eButton
                    onClick={() => {
                      setPicked({ lat: mapCenter[1], lon: mapCenter[0], label: 'Dropped pin (map center)' });
                      setStep('details');
                    }}
                    variant="text"
                    style={{ color: 'var(--lobster-gold)' }}
                  >
                    Use current map center →
                  </M3eButton>

                  <M3eDivider />

                  {/* Close */}
                  <M3eButton onClick={onClose} variant="outlined" style={{ width: '100%' }}>
                    Cancel
                  </M3eButton>
                </>
              )}

              {step === 'details' && picked && (
                <>
                  <M3eHeading size="large">Tell us about it</M3eHeading>
                  <p style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', margin: '0 0 12px 0' }}>
                    {picked.label}
                  </p>

                  {/* Name */}
                  <M3eFormField>
                    <label htmlFor="business-name">Business name</label>
                    <input
                      id="business-name"
                      placeholder="e.g., Goodfood Café"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      style={inputStyle}
                    />
                  </M3eFormField>

                  {/* Category */}
                  <M3eFormField>
                    <label htmlFor="business-category">Category</label>
                    <input
                      id="business-category"
                      placeholder="e.g., Café, Restaurant, Shop"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      style={inputStyle}
                    />
                  </M3eFormField>

                  {/* Description */}
                  <M3eFormField>
                    <label htmlFor="business-description">Description (optional)</label>
                    <textarea
                      id="business-description"
                      placeholder="Tell us about this business..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                    />
                  </M3eFormField>

                  {/* Phone */}
                  <M3eFormField>
                    <label htmlFor="business-phone">Phone (optional)</label>
                    <input
                      id="business-phone"
                      type="tel"
                      placeholder="+47 55 12 34 56"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      style={inputStyle}
                    />
                  </M3eFormField>

                  {/* Website */}
                  <M3eFormField>
                    <label htmlFor="business-website">Website (optional)</label>
                    <input
                      id="business-website"
                      type="url"
                      placeholder="https://example.com"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      style={inputStyle}
                    />
                  </M3eFormField>

                  {/* Photo URL */}
                  <M3eFormField>
                    <label htmlFor="business-photo">Photo URL (optional)</label>
                    <input
                      id="business-photo"
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      style={inputStyle}
                    />
                  </M3eFormField>

                  {/* Image Preview */}
                  {form.imageUrl && (
                    <img
                      src={form.imageUrl}
                      alt="Business preview"
                      style={imagePreviewStyle}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}
                    />
                  )}

                  {/* Error Message */}
                  {error && (
                    <p style={{ color: 'var(--md-sys-color-error)', fontSize: '12px', margin: '0' }}>
                      ❌ {error}
                    </p>
                  )}

                  {/* Loading Progress */}
                  {submitting && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 4px' }}>
                      <WavyLinearProgress width={296} height={14} />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <M3eDivider />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <M3eButton
                      onClick={() => setStep('location')}
                      variant="outlined"
                      disabled={submitting}
                    >
                      Back
                    </M3eButton>
                    <M3eButton
                      onClick={handleSubmit}
                      onPointerDown={submitRipple.addRipple}
                      disabled={!form.name || !form.category || submitting}
                      variant="filled"
                      style={{ position: 'relative', overflow: 'hidden', flex: 1 }}
                    >
                      {submitting ? 'Adding…' : 'Add business'}
                      <RippleContainer ripples={submitRipple.ripples} onRippleDone={submitRipple.removeRipple} />
                    </M3eButton>
                  </div>
                </>
              )}
            </div>
          </M3eDialog>
        </animated.div>
      )
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  marginTop: 8,
  borderRadius: 10,
  border: `1px solid var(--md-sys-color-outline-variant)`,
  background: 'var(--md-sys-color-surface-container)',
  color: 'var(--md-sys-color-on-surface)',
  fontFamily: '"Google Sans Flex", sans-serif',
  fontSize: 14,
};

const imagePreviewStyle: CSSProperties = {
  width: '100%',
  height: 120,
  objectFit: 'cover',
  borderRadius: 10,
  marginTop: 8,
  // display starts as 'block' via inline style below in the onLoad
  // handler; onError hides it entirely rather than showing a broken
  // image icon for a bad URL
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
