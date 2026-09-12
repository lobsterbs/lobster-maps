/**
 * Enhanced Search Bar
 * Dark, glassy design matching the rest of the site
 */

import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader, X } from 'lucide-react';

interface SearchResult {
  lat: number;
  lon: number;
  name?: string;
  address?: string;
  type?: 'place' | 'business';
}

interface SearchBarEnhancedProps {
  onSearch?: (query: string) => void;
  onLocationSelect?: (lat: number, lon: number, name: string) => void;
  placeholder?: string;
}

const SearchBarEnhanced: React.FC<SearchBarEnhancedProps> = ({
  onSearch = () => {},
  onLocationSelect = () => {},
  placeholder = 'Search locations, businesses...',
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const performSearch = async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleSelectResult = (result: SearchResult) => {
    const name = result.name || result.address || 'Unknown';
    onSearch(name);
    if (result.lat !== 0 || result.lon !== 0) {
      onLocationSelect(result.lat, result.lon, name);
    }
    setQuery('');
    setSearchResults([]);
    setIsFocused(false);
  };

  const handleClear = () => {
    setQuery('');
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSelectResult({
        lat: 0,
        lon: 0,
        name: query,
        type: 'place',
      });
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '40rem', margin: '0 auto', padding: '0 1rem' }}>
      <div
        style={{
          position: 'relative',
          transition: 'all 300ms ease',
          backgroundColor: isFocused ? 'rgba(30, 41, 59, 0.8)' : 'rgba(30, 41, 59, 0.6)',
          backdropFilter: 'blur(10px)',
          border: isFocused ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: isFocused
            ? '0 8px 32px rgba(16, 185, 129, 0.1)'
            : '0 4px 12px rgba(0, 0, 0, 0.3)',
          borderRadius: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem' }}>
          <Search
            size={20}
            style={{
              transition: 'color 300ms ease',
              color: isFocused ? '#10b981' : 'rgba(203, 213, 225, 0.6)',
              flexShrink: 0,
            }}
          />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              outline: 'none',
              color: '#f1f5f9',
              fontSize: '0.875rem',
              border: 'none',
              fontFamily: '"Google Sans Flex", sans-serif',
            }}
          />

          {isLoading && (
            <Loader
              size={18}
              style={{
                color: '#10b981',
                animation: 'spin 0.8s linear infinite',
                flexShrink: 0,
              }}
            />
          )}

          {query && !isLoading && (
            <button
              onClick={handleClear}
              style={{
                padding: '0.25rem',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'background-color 300ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X size={18} style={{ color: 'rgba(203, 213, 225, 0.6)' }} />
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {isFocused && searchResults.length > 0 && (
          <div
            style={{
              borderTop: '1px solid rgba(148, 163, 184, 0.2)',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectResult(result)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                  color: '#f1f5f9',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 200ms ease',
                  fontSize: '0.875rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ fontWeight: '500' }}>{result.name || result.address || 'Unknown'}</div>
                {result.type && (
                  <div style={{ fontSize: '0.75rem', color: 'rgba(203, 213, 225, 0.5)' }}>
                    {result.type === 'business' ? '🏢 Business' : '📍 Place'}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBarEnhanced;
