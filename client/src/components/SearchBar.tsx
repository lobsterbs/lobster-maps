import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { animated, useTransition } from '@react-spring/web';
import { geocodeAddress, type GeocodeResult } from '../lib/api';

type Props = {
  onSelect: (lat: number, lon: number, label: string) => void;
};

export function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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

  const dropdownOpen = focused && results.length > 0;
  const transition = useTransition(dropdownOpen, {
    from: { opacity: 0, transform: 'translateY(-8px) scale(0.98)' },
    enter: { opacity: 1, transform: 'translateY(0px) scale(1)' },
    leave: { opacity: 0, transform: 'translateY(-8px) scale(0.98)' },
    config: { tension: 300, friction: 26 },
  });

  return (
    <div style={{ position: 'absolute', top: 16, left: 16, right: 16, maxWidth: 420, zIndex: 5 }}>
      <div style={pillStyle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" stroke="var(--lobster-text-dim)" strokeWidth="2" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="var(--lobster-text-dim)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)} // let a result click register first
          placeholder="Search for a place"
          style={inputStyle}
        />
      </div>

      {transition(
        (style, show) =>
          show && (
            <animated.div style={{ ...style, ...dropdownStyle }}>
              {results.map((r) => (
                <button
                  key={`${r.lat}-${r.lon}`}
                  onClick={() => {
                    onSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
                    setQuery(r.display_name);
                    setResults([]);
                  }}
                  style={resultRowStyle}
                >
                  {r.display_name}
                </button>
              ))}
            </animated.div>
          )
      )}
    </div>
  );
}

const pillStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 16px',
  borderRadius: 999,
  background: 'rgba(21, 21, 21, 0.72)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
};

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--lobster-text)',
  fontFamily: 'var(--font-body)',
  fontSize: 15,
};

const dropdownStyle: CSSProperties = {
  marginTop: 8,
  borderRadius: 16,
  background: 'rgba(21, 21, 21, 0.85)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  overflow: 'hidden',
};

const resultRowStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '10px 14px',
  border: 'none',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  background: 'transparent',
  color: 'var(--lobster-text)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  cursor: 'pointer',
};
