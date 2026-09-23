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
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn('Failed to parse search preferences:', e);
      return {};
    }
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
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <Search
          size={20}
          style={{
            position: 'absolute',
            left: '16px',
            top: '14px',
            color: 'var(--md-sys-color-primary)',
            pointerEvents: 'none',
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            paddingLeft: '48px',
            paddingRight: '40px',
            paddingTop: '12px',
            paddingBottom: '12px',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            color: 'var(--md-sys-color-on-surface)',
            border: `1px solid var(--md-sys-color-outline-variant)`,
            borderRadius: '8px',
            fontSize: '14px',
            transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
            outline: 'none',
          }}
          onFocus={(e) => {
            setShowSuggestions(true);
            e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--md-sys-state-primary-focus)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--md-sys-color-outline-variant)';
            e.currentTarget.style.boxShadow = 'none';
          }}
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
            style={{ position: 'absolute', right: '12px', top: '12px' }}
          />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          border: `1px solid var(--md-sys-color-outline-variant)`,
          borderRadius: '8px',
          boxShadow: 'var(--md-sys-elevation-shadow-2)',
          zIndex: 50,
          overflow: 'hidden',
        }}>
          {suggestions.map((sugg, idx) => {
            const isSelected = idx === selectedIndex;
            const getIcon = () => {
              switch (sugg.type) {
                case 'business':
                  return <MapPin size={16} style={{ color: 'var(--md-sys-color-primary)' }} />;
                case 'recent':
                  return <Clock size={16} style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />;
                case 'smart':
                  return <Star size={16} style={{ color: 'var(--md-sys-color-primary)' }} />;
                default:
                  return <MapPin size={16} />;
              }
            };

            return (
              <button
                key={sugg.id}
                onClick={() => handleSelect(sugg)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: isSelected ? `var(--md-sys-state-primary-focus)` : 'transparent',
                  color: 'var(--md-sys-color-on-surface)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color var(--app-duration-short2) var(--app-ease-standard)',
                }}
                className="md-search-option"
                data-selected={isSelected}
              >
                <div style={{ color: 'var(--md-sys-color-primary)', flexShrink: 0 }}>
                  {getIcon()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--md-sys-color-on-surface)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {sugg.name}
                  </div>
                  {sugg.address && (
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--md-sys-color-on-surface-variant)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {sugg.address}
                    </div>
                  )}
                </div>
                {sugg.score && (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--md-sys-color-primary)',
                    fontWeight: 600,
                  }}>
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
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          border: `1px solid var(--md-sys-color-outline-variant)`,
          borderRadius: '8px',
          boxShadow: 'var(--md-sys-elevation-shadow-2)',
          zIndex: 50,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--md-sys-color-on-surface-variant)',
            textTransform: 'uppercase',
            paddingLeft: '4px',
            letterSpacing: '0.5px',
          }}>
            Recent Destinations
          </div>
          {prefEngine.getRecent(4).map((sugg) => (
            <button
              key={sugg.id}
              onClick={() => handleSelect(sugg)}
              style={{
                width: '100%',
                padding: '8px 12px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: 'var(--md-sys-color-on-surface)',
                cursor: 'pointer',
                transition: 'background-color var(--app-duration-short2) var(--app-ease-standard)',
                fontSize: '14px',
              }}
              className="md-search-suggestion"
            >
              <Clock size={14} style={{ color: 'var(--md-sys-color-on-surface-variant)', flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sugg.name}
              </span>
              <span style={{
                fontSize: '12px',
                color: 'var(--md-sys-color-on-surface-variant)',
                flexShrink: 0,
              }}>
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
