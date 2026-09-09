/**
 * Material Design 3 Enhanced Route Selector Card
 * - Risk factor display (safety, weather, toll, speed cameras)
 * - Gradient backgrounds per route type
 * - Current location awareness
 * - Metric badges with rich data
 * - Smooth animations (Framer Motion ready)
 */

import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  TrendingUp,
  AlertTriangle,
  Shield,
  Cloud,
  DollarSign,
  Zap,
  ChevronRight,
} from 'lucide-react';

export interface RouteWithRisk {
  id: string;
  type: 'fastest' | 'safest' | 'scenic';
  distance_km: number;
  duration_min: number;
  elevation_m: number;
  
  // Risk factors
  safety_score: number; // 0-100 (0=dangerous, 100=safest)
  weather_risk: 'clear' | 'rain' | 'snow' | 'wind'; // 0-100
  weather_risk_level: number;
  toll_cost_nok?: number;
  speed_cameras_count: number;
  
  // Scenic/quality
  scenic_score: number; // 0-100
  traffic_level: 'light' | 'moderate' | 'heavy'; // current
}

interface MD3EnhancedRouteSelectorCardProps {
  routes: RouteWithRisk[];
  selectedId?: string;
  currentLocation?: [number, number];
  onSelect?: (id: string) => void;
  onNavigate?: (id: string) => void;
}

const getGradient = (type: string) => {
  const gradients: Record<string, string> = {
    fastest:
      'bg-gradient-to-br from-sky-600 to-sky-900 border-sky-500',
    safest:
      'bg-gradient-to-br from-emerald-600 to-emerald-900 border-emerald-500',
    scenic:
      'bg-gradient-to-br from-purple-600 to-purple-900 border-purple-500',
  };
  return gradients[type] || gradients.fastest;
};

const getTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    fastest: <Zap size={20} />,
    safest: <Shield size={20} />,
    scenic: <TrendingUp size={20} />,
  };
  return icons[type] || icons.fastest;
};

const getRiskColor = (score: number) => {
  if (score >= 75) return 'bg-emerald-500/20 text-emerald-300 border-emerald-600';
  if (score >= 50) return 'bg-amber-500/20 text-amber-300 border-amber-600';
  return 'bg-red-500/20 text-red-300 border-red-600';
};

const getRiskLabel = (score: number) => {
  if (score >= 75) return 'Safe';
  if (score >= 50) return 'Caution';
  return 'Risky';
};

export const MD3EnhancedRouteSelectorCard: React.FC<
  MD3EnhancedRouteSelectorCardProps
> = ({ routes, selectedId, currentLocation, onSelect, onNavigate }) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {routes.map((route) => {
        const isSelected = selectedId === route.id;
        const isExpanded = expanded === route.id;
        const hours = Math.floor(route.duration_min / 60);
        const mins = route.duration_min % 60;
        const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        // Calculate overall risk (weighted average)
        const overallRisk = Math.round(
          route.safety_score * 0.4 +
            (100 - route.weather_risk_level) * 0.3 +
            (route.speed_cameras_count > 0 ? 50 : 80) * 0.3
        );

        return (
          <button
            key={route.id}
            onClick={() => onSelect?.(route.id)}
            className={`w-full text-left rounded-2xl p-4 border-2 transition-all duration-200 ${
              isSelected
                ? 'ring-2 ring-emerald-400 shadow-xl'
                : 'hover:shadow-lg'
            } ${getGradient(route.type)}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg text-white/90">
                  {getTypeIcon(route.type)}
                </div>
                <div>
                  <h3 className="font-bold text-white capitalize">
                    {route.type}
                  </h3>
                  <p className="text-xs text-white/70">
                    {route.type === 'fastest'
                      ? 'Quickest route'
                      : route.type === 'safest'
                      ? 'Lowest risk'
                      : 'Most scenic'}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={20}
                className={`text-white transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            </div>

            {/* Main metrics row */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {/* Distance */}
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-white">
                  {route.distance_km}
                </div>
                <div className="text-xs text-white/70">km</div>
              </div>

              {/* Duration */}
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-white flex items-center justify-center gap-1">
                  <Clock size={14} />
                  {durationStr}
                </div>
                <div className="text-xs text-white/70">time</div>
              </div>

              {/* Elevation */}
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-white flex items-center justify-center gap-1">
                  <TrendingUp size={14} />
                  {route.elevation_m}
                </div>
                <div className="text-xs text-white/70">m</div>
              </div>

              {/* Risk Badge */}
              <div
                className={`rounded-lg p-2 text-center border ${getRiskColor(
                  overallRisk
                )}`}
              >
                <div className="text-lg font-bold">{overallRisk}</div>
                <div className="text-xs">{getRiskLabel(overallRisk)}</div>
              </div>
            </div>

            {/* Risk factors row */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Safety score */}
              <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                <Shield size={14} className="text-emerald-200" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/70">Safety</div>
                  <div className="text-sm font-semibold text-white">
                    {route.safety_score}%
                  </div>
                </div>
              </div>

              {/* Weather */}
              <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                <Cloud size={14} className="text-blue-200" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/70 capitalize">
                    {route.weather_risk}
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {route.weather_risk_level}%
                  </div>
                </div>
              </div>

              {/* Toll if applicable */}
              {route.toll_cost_nok && (
                <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                  <DollarSign size={14} className="text-amber-200" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/70">Toll</div>
                    <div className="text-sm font-semibold text-white">
                      {route.toll_cost_nok} NOK
                    </div>
                  </div>
                </div>
              )}

              {/* Speed cameras */}
              {route.speed_cameras_count > 0 && (
                <div className="bg-red-500/10 rounded-lg px-3 py-2 flex items-center gap-2 border border-red-500/30">
                  <AlertTriangle size={14} className="text-red-300" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-red-300">Cameras</div>
                    <div className="text-sm font-semibold text-red-200">
                      {route.speed_cameras_count}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scenic/Quality bars (collapsed) */}
            {route.scenic_score > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/70">Scenery</span>
                  <span className="text-xs font-semibold text-white">
                    {route.scenic_score}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                    style={{ width: `${route.scenic_score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Traffic indicator */}
            <div className="flex items-center justify-between text-xs text-white/70 mb-3">
              <span>Traffic: {route.traffic_level}</span>
              <span className="inline-block px-2 py-1 bg-white/10 rounded text-white/80">
                {route.traffic_level === 'heavy'
                  ? '🔴'
                  : route.traffic_level === 'moderate'
                  ? '🟡'
                  : '🟢'}
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.(route.id);
                }}
                className="flex-1 py-2.5 px-4 bg-white text-slate-900 rounded-lg font-semibold hover:bg-white/90 transition-colors"
              >
                Navigate
              </button>
              {currentLocation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(isExpanded ? null : route.id);
                  }}
                  className="px-4 py-2.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm"
                >
                  {isExpanded ? 'Less' : 'More'}
                </button>
              )}
            </div>

            {/* Expanded details */}
            {isExpanded && currentLocation && (
              <div className="mt-4 pt-4 border-t border-white/20 space-y-2 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>Distance from current: {route.distance_km} km</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>
                    Overall risk level: {getRiskLabel(overallRisk)}
                  </span>
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MD3EnhancedRouteSelectorCard;
