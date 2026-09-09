/**
 * Material Design 3 Navigation Flow
 * Complete search-to-navigation experience
 * - Combines advanced search + enhanced route selector
 * - Smooth transitions and animations ready
 * - Current location awareness
 */

import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { MD3AdvancedSearchBar, SearchSuggestion } from './MD3AdvancedSearchBar';
import { MD3EnhancedRouteSelectorCard, RouteWithRisk } from './MD3EnhancedRouteSelectorCard';

export interface NavigationFlowProps {
  businesses?: SearchSuggestion[];
  currentLocation?: [number, number];
  onNavigate?: (destination: SearchSuggestion, route: RouteWithRisk) => void;
}

// Mock data generator for demo
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
  {
    id: 'route-scenic',
    type: 'scenic',
    distance_km: 18.9,
    duration_min: 35,
    elevation_m: 380,
    safety_score: 85,
    weather_risk: 'clear',
    weather_risk_level: 12,
    toll_cost_nok: undefined,
    speed_cameras_count: 0,
    scenic_score: 88,
    traffic_level: 'light',
  },
];

export const MD3NavigationFlow: React.FC<NavigationFlowProps> = ({
  businesses = [],
  currentLocation,
  onNavigate,
}) => {
  const [origin, setOrigin] = useState<SearchSuggestion | null>(
    currentLocation ? {
      id: 'current',
      name: 'Current Location',
      type: 'poi',
      coordinates: currentLocation,
    } : null
  );
  const [destination, setDestination] = useState<SearchSuggestion | null>(null);
  const [routes, setRoutes] = useState<RouteWithRisk[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDestinationSelect = async (suggestion: SearchSuggestion) => {
    setDestination(suggestion);
    setLoading(true);

    // Simulate API call to get routes
    setTimeout(() => {
      setRoutes(generateMockRoutes(suggestion.name));
      setLoading(false);
      setSelectedRoute('route-fastest'); // Auto-select fastest
    }, 800);
  };

  const handleNavigate = (routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    if (destination && route && onNavigate) {
      onNavigate(destination, route);
    }
  };

  const handleSwapLocations = () => {
    setOrigin(destination);
    setDestination(origin);
    setRoutes([]);
    setSelectedRoute(null);
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Card */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-lg">
        {/* Origin */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">
            From
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
            <MapPin size={16} className="text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-slate-200">
              {origin?.name || 'Current Location'}
            </span>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={handleSwapLocations}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-200"
            title="Swap locations"
          >
            <Navigation size={18} />
          </button>
        </div>

        {/* Destination Search */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">
            To
          </label>
          <MD3AdvancedSearchBar
            placeholder="Search destination..."
            onSelect={handleDestinationSelect}
            currentLocation={currentLocation}
            businesses={businesses}
          />
        </div>
      </div>

      {/* Routes Display */}
      {destination && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-100">
                Routes to {destination.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {routes.length} option(s) found
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs text-slate-400">Computing...</span>
              </div>
            )}
          </div>

          {loading && (
            <div className="py-8 text-center">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400 mt-2">Finding optimal routes...</p>
            </div>
          )}

          {!loading && routes.length > 0 && (
            <MD3EnhancedRouteSelectorCard
              routes={routes}
              selectedId={selectedRoute || undefined}
              currentLocation={currentLocation}
              onSelect={setSelectedRoute}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      )}

      {/* Info */}
      {!destination && (
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 text-center">
          <p className="text-sm text-slate-400">
            Enter a destination to see available routes and risk factors
          </p>
        </div>
      )}
    </div>
  );
};

export default MD3NavigationFlow;
