/**
 * Enhanced Search Bar - Material Design 3
 * Animated, with autocomplete and recent searches
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock } from 'lucide-react';

interface SearchBarEnhancedProps {
  onSearch: (query: string) => void;
  onLocationSelect?: (lat: number, lon: number) => void;
  placeholder?: string;
}

export const SearchBarEnhanced: React.FC<SearchBarEnhancedProps> = ({
  onSearch,
  placeholder = 'Search locations, businesses...',
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    onSearch(searchQuery);

    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));

    setQuery('');
    setIsFocused(false);
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div
        className={`relative transition-all duration-300 ${
          isFocused
            ? 'bg-white shadow-lg rounded-2xl'
            : 'bg-white/80 shadow-md rounded-full'
        }`}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Search
            size={20}
            className={`transition-colors ${
              isFocused ? 'text-emerald-600' : 'text-gray-500'
            }`}
          />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(query);
              }
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-sm"
          />

          {query && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {isFocused && recentSearches.length > 0 && !query && (
          <div className="border-t border-gray-100 divide-y divide-gray-100">
            {recentSearches.map((search, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(search)}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <Clock size={16} className="text-gray-400" />
                {search}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Helper text */}
      {isFocused && (
        <div className="mt-2 text-xs text-gray-500 px-4">
          Press Enter to search
        </div>
      )}
    </div>
  );
};

export default SearchBarEnhanced;
