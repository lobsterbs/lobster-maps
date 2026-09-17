import React, { useRef, useState } from 'react';
import { Search, Loader, X } from 'lucide-react';

interface SearchResult {
  id?: string;
  lat: number;
  lon: number;
  name?: string;
  address?: string;
  category?: string;
  rating?: number;
  reviews?: number;
  images?: string[];
  phone?: string;
  website?: string;
  hours?: string;
}

interface SearchBarEnhancedProps {
  onLocationSelect?: (result: SearchResult) => void;
}

const SearchBarEnhanced: React.FC<SearchBarEnhancedProps> = ({ onLocationSelect = () => {} }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowResults(true);
    
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (result: SearchResult) => {
    // Show detail sheet by calling onLocationSelect
    onLocationSelect(result);
    setQuery(result.name || '');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          transition: 'all 200ms ease',
        }}
      >
        <Search size={18} color="var(--md-sys-color-on-surface-variant)" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setShowResults(!!results.length)}
          placeholder="Search places, businesses..."
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            outline: 'none',
            color: 'var(--md-sys-color-on-surface)',
            border: 'none',
            fontFamily: '"Google Sans Flex", sans-serif',
            fontSize: '14px',
          }}
        />
        {isLoading && <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--md-sys-color-on-surface)' }} />}
        {query && !isLoading && (
          <button onClick={() => { setQuery(''); setResults([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} color="var(--md-sys-color-on-surface-variant)" />
          </button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          backdropFilter: 'blur(12px)',
          border: `1px solid var(--md-sys-color-outline-variant)`,
          borderRadius: '8px',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 1000,
        }}>
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: i < results.length - 1 ? `1px solid var(--md-sys-color-outline-variant)` : 'none',
                color: 'var(--md-sys-color-on-surface)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `rgba(16, 185, 129, 0.08)`)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ fontWeight: '500' }}>{r.name || r.address}</div>
              {r.category && (
                <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  {r.category}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBarEnhanced;
