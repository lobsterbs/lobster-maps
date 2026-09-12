/**
 * Enhanced Search Bar - Material Design 3
 * Animated, with autocomplete and recent searches
 * Integrates with backend geocoding + search API
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, Loader } from 'lucide-react';

interface SearchBarEnhancedProps {
  onSearch: (query: string) => void;
  onLocationSelect?: (lat: number, lon: number, name: string) => void;
  placeholder?: string;
}

interface SearchResult {
  lat: number;
  lon: number;
  name: string;
  type: 'address' | 'place' | 'business';
  address?: string;
  score?: number;
}

export const SearchBarEnhanced: React.FC<SearchBarEnhancedProps> = ({
  onSearch,
  onLocationSelect,
  placeholder = 'Search locations, businesses...',
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.error('Failed to load recent searches', e);
      }
    }
  }, []);

  // Fetch search results with debounce
  const performSearch = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );
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

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce search (300ms)
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleSelectResult = (result: SearchResult) => {
    const name = result.name || result.address || 'Unknown';
    
    onSearch(name);
    if (onLocationSelect) {
      onLocationSelect(result.lat, result.lon, name);
    }

    // Save to recent
    const updated = [
      name,
      ...recentSearches.filter((s) => s !== name),
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));

    // Clear UI
    setQuery('');
    setSearchResults([]);
    setIsFocused(false);
  };

  const handleSelectRecent = (recent: string) => {
    setQuery(recent);
    performSearch(recent);
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
          backgroundColor: isFocused ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
          boxShadow: isFocused
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          borderRadius: isFocused ? '1rem' : '9999px',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem' }}>
          <Search
            size={20}
            style={{
              transition: 'color 300ms ease',
              color: isFocused ? '#10b981' : '#6b7280',
            }}
          />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              outline: 'none',
              color: '#1f2937',
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
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X size={18} style={{ color: '#6b7280' }} />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {isFocused && (
          <div style={{ borderTop: '1px solid #f3f4f6' }}>
            {/* Results from API */}
            {searchResults.length > 0 ? (
              searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectResult(result)}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Search size={16} className="text-emerald-600" />
                  <div className="flex-1">
                    <div className="font-medium">{result.name}</div>
                    {result.address && (
                      <div className="text-xs text-gray-500">{result.address}</div>
                    )}
                  </div>
                  {result.type !== 'place' && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                      {result.type}
                    </span>
                  )}
                </button>
              ))
            ) : query.trim().length === 0 && recentSearches.length > 0 ? (
              /* Recent searches */
              recentSearches.map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectRecent(search)}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Clock size={16} className="text-gray-400" />
                  {search}
                </button>
              ))
            ) : isLoading ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                Searching...
              </div>
            ) : query.trim().length > 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No results found
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Helper text */}
      {isFocused && (
        <div className="mt-2 text-xs text-gray-500 px-4">
          {query.trim().length === 0 && recentSearches.length > 0
            ? 'Tap a recent search or type to search'
            : 'Press Enter to search or tap a result'}
        </div>
      )}
    </div>
  );
};

export default SearchBarEnhanced;
