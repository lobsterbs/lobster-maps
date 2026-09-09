/**
 * Material Design 3 Advanced Search Bar
 * - Business + POI autocomplete (local + external)
 * - Recent destinations
 * - Device-side preference learning (localStorage)
 * - Intelligent suggestions based on user history
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Clock, Star, X } from 'lucide-react';
import { MD3Button } from './MD3Button';

export interface SearchSuggestion {
  id: string;
  name: string;
  address?: string;
  type: 'business' | 'poi' | 'recent' | 'smart';
  score?: number; // relevance/frequency score
  coordinates?: [number, number];
  icon?: string;
}

interface MD3AdvancedSearchBarProps {
  placeholder?: string;
  onSelect: (suggestion: SearchSuggestion) => void;
  currentLocation?: [number, number];
  businesses?: SearchSuggestion[];
}

// Local preference learning engine
class PreferenceEngine {
  private storageKey = 'lobster_search_preferences';
  
  private getPrefs() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {};
  }

  private savePrefs(prefs: Record<string, number>) {
    localStorage.setItem(this.storageKey, JSON.stringify(prefs));
  }

  recordSelection(name: string, type: string) {
    const key = `${type}:${name}`;
    const prefs = this.getPrefs();
    prefs[key] = (prefs[key] || 0) + 1;
    this.savePrefs(prefs);
  }

  getRecommendations(query: string, maxCount: number = 3): SearchSuggestion[] {
    const prefs = this.getPrefs();
    return Object.entries(prefs)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, maxCount)
      .map(([key, score]) => {
        const [type, name] = key.split(':');
        return {
          id: key,
          name,
          type: type as 'business' | 'recent',
          score: score as number,
        };
      });
  }

  getRecent(maxCount: number = 5): SearchSuggestion[] {
    const prefs = this.getPrefs();
    return Object.entries(prefs)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, maxCount)
      .map(([key, score]) => {
        const [type, name] = key.split(':');
        return {
          id: key,
          name,
          type: 'recent',
          score: score as number,
        };
      });
  }
}

const prefEngine = new PreferenceEngine();

export const MD3AdvancedSearchBar: React.FC<MD3AdvancedSearchBarProps> = ({
  placeholder = 'Search destination or business...',
  onSelect,
  currentLocation,
  businesses = [],
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent destinations on mount
  useEffect(() => {
    if (!query && showSuggestions) {
      setSuggestions(prefEngine.getRecent(5));
    }
  }, [showSuggestions, query]);

  // Smart search with fuzzy matching + preference learning
  const handleSearch = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);

    if (!value.trim()) {
      setSuggestions(prefEngine.getRecent(5));
      return;
    }

    const lower = value.toLowerCase();
    const businessMatches = businesses.filter((b) =>
      b.name.toLowerCase().includes(lower)
    );

    const smartMatches = prefEngine
      .getRecommendations(value, 3)
      .filter((r) => r.name.toLowerCase().includes(lower));

    setSuggestions([...businessMatches.slice(0, 3), ...smartMatches]);
  };

  const handleSelect = (suggestion: SearchSuggestion) => {
    prefEngine.recordSelection(suggestion.name, suggestion.type);
    onSelect(suggestion);
    setQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    }
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-4 top-3.5 text-emerald-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-12 pr-10 py-3 bg-slate-800 text-slate-100 rounded-lg border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 outline-none transition-all text-sm placeholder-slate-500"
        />
        {query && (
          <MD3Button
            variant="text"
            size="small"
            icon={<X size={18} />}
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-3.5"
          />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {suggestions.map((sugg, idx) => {
            const isSelected = idx === selectedIndex;
            const getIcon = () => {
              switch (sugg.type) {
                case 'business':
                  return <MapPin size={16} className="text-emerald-400" />;
                case 'recent':
                  return <Clock size={16} className="text-slate-400" />;
                case 'smart':
                  return <Star size={16} className="text-amber-400" />;
                default:
                  return <MapPin size={16} />;
              }
            };

            return (
              <button
                key={sugg.id}
                onClick={() => handleSelect(sugg)}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                  isSelected ? 'bg-emerald-600 bg-opacity-20' : 'hover:bg-slate-700'
                }`}
              >
                {getIcon()}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-100 truncate">
                    {sugg.name}
                  </div>
                  {sugg.address && (
                    <div className="text-xs text-slate-400 truncate">{sugg.address}</div>
                  )}
                </div>
                {sugg.score && (
                  <div className="text-xs text-amber-300 font-semibold">
                    {Math.round(sugg.score * 10)}%
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State - Show Recent */}
      {showSuggestions && !query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase px-1">
            Recent Destinations
          </div>
          {prefEngine.getRecent(4).map((sugg) => (
            <button
              key={sugg.id}
              onClick={() => handleSelect(sugg)}
              className="w-full px-3 py-2 text-left flex items-center gap-2 rounded hover:bg-slate-700 transition-colors"
            >
              <Clock size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-200 truncate">{sugg.name}</span>
              <span className="text-xs text-slate-500 ml-auto flex-shrink-0">
                {sugg.score}x
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MD3AdvancedSearchBar;
