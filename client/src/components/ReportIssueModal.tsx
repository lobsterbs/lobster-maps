import { useState } from 'react';
import { animated, useTransition } from '@react-spring/web';
import { M3eDialog } from '@m3e/react/dialog';
import { M3eHeading } from '@m3e/react/heading';
import { M3eButton } from '@m3e/react/button';
import { M3eFormField } from '@m3e/react/form-field';
import { M3eDivider } from '@m3e/react/divider';
import { WavyLinearProgress } from './WavyLinearProgress';

type Props = {
  open: boolean;
  onClose: () => void;
  mapCenter: [number, number]; // [lng, lat]
};

const ISSUE_TYPES = ['Road damage', 'Blocked path', 'Missing data', 'Business info wrong', 'Other'];

export function ReportIssueModal({ open, onClose, mapCenter }: Props) {
  const [form, setForm] = useState({
    type: 'Other',
    description: '',
    lat: mapCenter[1],
    lon: mapCenter[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transition = useTransition(open, {
    from: { opacity: 0, transform: 'translateY(24px) scale(0.96)' },
    enter: { opacity: 1, transform: 'translateY(0px) scale(1)' },
    leave: { opacity: 0, transform: 'translateY(24px) scale(0.96)' },
    config: { tension: 280, friction: 24 },
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          description: form.description,
          latitude: form.lat,
          longitude: form.lon,
        }),
      });
      if (!res.ok) throw new Error('Failed to report issue');
      setForm({ type: 'Other', description: '', lat: mapCenter[1], lon: mapCenter[0] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

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
          <animated.div
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.32)',
              zIndex: 0,
            }}
          />

          <M3eDialog
            open={open}
            onChange={(e: any) => !e.currentTarget.checked && onClose()}
            style={{
              zIndex: 1,
              '--md-dialog-container-max-width': '480px',
              '--md-dialog-container-inset-block-start': '24px',
            } as any}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
              <M3eHeading size="large">Report an issue</M3eHeading>

              <M3eFormField>
                <label htmlFor="issue-type">Issue type</label>
                <select
                  id="issue-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={inputStyle}
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </M3eFormField>

              <M3eFormField>
                <label htmlFor="issue-desc">What's wrong?</label>
                <textarea
                  id="issue-desc"
                  autoFocus
                  placeholder="Describe the issue..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                />
              </M3eFormField>

              <M3eFormField>
                <label>Reported at (map center)</label>
                <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Lat: {form.lat.toFixed(4)} | Lon: {form.lon.toFixed(4)}
                </div>
              </M3eFormField>

              {error && (
                <p style={{ color: 'var(--md-sys-color-error)', fontSize: '12px', margin: '0' }}>
                  ❌ {error}
                </p>
              )}

              {submitting && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <WavyLinearProgress width={296} height={14} />
                </div>
              )}

              <M3eDivider />

              <div style={{ display: 'flex', gap: '12px' }}>
                <M3eButton onClick={onClose} variant="outlined" disabled={submitting}>
                  Cancel
                </M3eButton>
                <M3eButton
                  onClick={handleSubmit}
                  disabled={!form.description || submitting}
                  variant="filled"
                  style={{ flex: 1 }}
                >
                  {submitting ? 'Reporting…' : 'Send report'}
                </M3eButton>
              </div>
            </div>
          </M3eDialog>
        </animated.div>
      )
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  marginTop: '8px',
  borderRadius: '8px',
  border: '1px solid var(--md-sys-color-outline)',
  background: 'var(--md-sys-color-surface-container)',
  color: 'var(--md-sys-color-on-surface)',
  fontFamily: '"Google Sans Flex", sans-serif',
  fontSize: '14px',
};
