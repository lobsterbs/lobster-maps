/**
 * Material Design 3 Navigation Flow
 * Complete search-to-navigation experience
 */

import React, { useState, CSSProperties } from 'react';
import { MapPin, Navigation, ArrowUp } from 'lucide-react';
import { MD3AdvancedSearchBar, SearchSuggestion } from './MD3AdvancedSearchBar';
import { MD3EnhancedRouteSelectorCard, RouteWithRisk } from './MD3EnhancedRouteSelectorCard';
import { MD3Button } from './MD3Button';

export interface NavigationFlowProps {
  businesses?: SearchSuggestion[];
  currentLocation?: [number, number];
  onNavigate?: (destination: SearchSuggestion, route: RouteWithRisk) => void;
}

const generateMockRoutes = (destination: string): RouteWithRisk[] => [
  {
    id: 'route-fastest',
    type: 'fastest',
    distance_km: 12.5,
    duration_min: 18,
    elevation_m: 180,
    safety_score: 78,
    weather_risk: 'clear',
    weather_risk_level: 10,
    toll_cost_nok: 35,
    speed_cameras_count: 1,
    scenic_score: 45,
    traffic_level: 'light',
  },
  {
    id: 'route-safest',
    type: 'safest',
    distance_km: 14.2,
    duration_min: 22,
    elevation_m: 120,
    safety_score: 92,
    weather_risk: 'clear',
    weather_risk_level: 8,
    toll_cost_nok: 35,
    speed_cameras_count: 0,
    scenic_score: 65,
    traffic_level: 'light',
  },
];

export const MD3NavigationFlow: React.FC<NavigationFlowProps> = ({
  businesses = [],
  currentLocation = [59.9139, 10.7522],
  onNavigate,
}) => {
  const [selectedDestination, setSelectedDestination] = useState<SearchSuggestion | null>(null);
  const [routes, setRoutes] = useState<RouteWithRisk[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteWithRisk | null>(null);

  const handleDestinationSelect = (destination: SearchSuggestion) => {
    setSelectedDestination(destination);
    setIsLoadingRoutes(true);
    setRoutes([]);
    setSelectedRoute(null);

    setTimeout(() => {
      setRoutes(generateMockRoutes(destination.name));
      setIsLoadingRoutes(false);
    }, 1000);
  };

  const handleRouteSelect = (route: RouteWithRisk) => {
    setSelectedRoute(route);
    if (selectedDestination && onNavigate) {
      onNavigate(selectedDestination, route);
    }
  };

  const handleReset = () => {
    setSelectedDestination(null);
    setRoutes([]);
    setSelectedRoute(null);
  };

  const containerStyle: CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const sectionStyle: CSSProperties = {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    borderRadius: '16px',
    padding: '16px',
    border: `1px solid var(--md-sys-color-outline-variant)`,
    boxShadow: 'var(--md-sys-elevation-shadow-1)',
  };

  const labelStyle: CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--md-sys-color-on-surface-variant)',
    textTransform: 'uppercase',
    marginBottom: '8px',
    display: 'block',
    letterSpacing: '0.5px',
  };

  const inputWrapperStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: '8px',
    border: `1px solid var(--md-sys-color-outline-variant)`,
  };

  const textStyle: CSSProperties = {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface)',
  };

  const swapButtonStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  };

  const titleStyle: CSSProperties = {
    fontWeight: 600,
    color: 'var(--md-sys-color-on-surface)',
  };

  const subtitleStyle: CSSProperties = {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '4px',
  };

  const loaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const pulseStyle: CSSProperties = {
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--md-sys-color-primary)',
    borderRadius: '50%',
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  const loadingContainerStyle: CSSProperties = {
    paddingTop: '32px',
    paddingBottom: '32px',
    textAlign: 'center',
  };

  const spinnerStyle: CSSProperties = {
    width: '32px',
    height: '32px',
    border: `2px solid var(--md-sys-color-primary)`,
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  };

  const emptyStateStyle: CSSProperties = {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
    border: `1px solid var(--md-sys-color-primary)`,
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {!selectedDestination ? (
        <>
          <div style={sectionStyle}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>From</label>
              <div style={inputWrapperStyle}>
                <MapPin size={16} style={{ color: 'var(--md-sys-color-primary)', flexShrink: 0 }} />
                <span style={textStyle}>
                  {currentLocation ? `${currentLocation[0].toFixed(4)}, ${currentLocation[1].toFixed(4)}` : 'Current Location'}
                </span>
              </div>
            </div>

            <div style={swapButtonStyle}>
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <ArrowUp size={20} style={{ color: 'var(--md-sys-color-primary)' }} />
              </button>
            </div>

            <div>
              <label style={labelStyle}>To</label>
              <MD3AdvancedSearchBar
                placeholder="Search destination..."
                onSelect={handleDestinationSelect}
              />
            </div>
          </div>
        </>
      ) : (
        <div style={sectionStyle}>
          <div style={headerStyle}>
            <div>
              <div style={titleStyle}>{selectedDestination.name}</div>
              <div style={subtitleStyle}>
                {selectedDestination.address || 'Location selected'}
              </div>
            </div>
            {!isLoadingRoutes && routes.length > 0 && (
              <div style={loaderStyle}>
                <div style={pulseStyle} />
                <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>Computing...</span>
              </div>
            )}
          </div>

          {isLoadingRoutes ? (
            <div style={loadingContainerStyle}>
              <div style={spinnerStyle} />
              <div style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '8px' }}>
                Finding optimal routes...
              </div>
            </div>
          ) : routes.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={{ fontSize: '14px', color: 'var(--md-sys-color-primary)' }}>
                No routes available. Please check your network connection.
              </div>
            </div>
          ) : (
            <MD3EnhancedRouteSelectorCard
              routes={routes}
              selectedId={selectedRoute?.id}
              currentLocation={currentLocation}
              onSelect={(routeId) => {
                const route = routes.find(r => r.id === routeId);
                if (route) handleRouteSelect(route);
              }}
              onNavigate={(routeId) => {
                const route = routes.find(r => r.id === routeId);
                if (route && selectedDestination) {
                  onNavigate?.(selectedDestination, route);
                }
              }}
            />
          )}

          {selectedRoute && (
            <MD3Button
              variant="filled"
              size="large"
              icon={<Navigation size={20} />}
              onClick={() => {
                if (selectedDestination && selectedRoute) {
                  onNavigate?.(selectedDestination, selectedRoute);
                }
              }}
              fullWidth
              style={{ marginTop: '16px' }}
            >
              Start Navigation
            </MD3Button>
          )}
        </div>
      )}
    </div>
  );
};

export default MD3NavigationFlow;
