/**
 * Material Design 3 Route Planner Card
 * Primary route display with distance, duration, elevation
 * Follows MD3 design system (Material You)
 */

import React, { useState } from 'react';
import { MapPin, Clock, TrendingUp, AlertCircle } from 'lucide-react';

export interface Route {
  id: string;
  distance_m: number;
  duration_seconds: number;
  elevation_m: number;
  polyline: string;
  toll_cost_nok?: number;
  speed_cameras?: Array<{ location: [number, number]; limit: number }>;
}

interface MD3RoutePlannerCardProps {
  origin: string;
  destination: string;
  route: Route;
  isLoading?: boolean;
  onNavigate?: () => void;
  isPrimary?: boolean;
}

export const MD3RoutePlannerCard: React.FC<MD3RoutePlannerCardProps> = ({
  origin,
  destination,
  route,
  isLoading = false,
  onNavigate,
  isPrimary = true,
}) => {
  const [expanded, setExpanded] = useState(false);

  const distance_km = (route.distance_m / 1000).toFixed(1);
  const duration_min = Math.round(route.duration_seconds / 60);
  const hours = Math.floor(duration_min / 60);
  const mins = duration_min % 60;

  const durationStr = hours > 0 
    ? `${hours}h ${mins}m`
    : `${mins}m`;

  return (
    <div className={`md-card ${isPrimary ? 'md-card-primary' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} className="text-emerald-500" />
            <span className="text-sm font-medium">{origin}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-slate-400" />
            <span className="text-sm font-medium">{destination}</span>
          </div>
        </div>
        <button
          onClick={() => onNavigate?.()}
          disabled={isLoading}
          className="md-btn md-btn-filled"
        >
          {isLoading ? 'Computing...' : 'Navigate'}
        </button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-slate-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">{distance_km}</div>
          <div className="text-xs text-slate-400">km</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-sky-400">
            <Clock size={20} />
            {durationStr}
          </div>
          <div className="text-xs text-slate-400">time</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-orange-400">
            <TrendingUp size={20} />
            {route.elevation_m}
          </div>
          <div className="text-xs text-slate-400">m</div>
        </div>
      </div>

      {/* Additional info */}
      <div className="space-y-2 mb-4">
        {route.toll_cost_nok && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-900 bg-opacity-20 rounded-lg border border-orange-700">
            <AlertCircle size={16} className="text-orange-400" />
            <span className="text-sm text-orange-100">Toll: {route.toll_cost_nok} NOK</span>
          </div>
        )}
        {route.speed_cameras && route.speed_cameras.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-900 bg-opacity-20 rounded-lg border border-red-700">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-sm text-red-100">{route.speed_cameras.length} speed camera(s)</span>
          </div>
        )}
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-sm text-emerald-400 hover:text-emerald-300 py-2"
      >
        {expanded ? 'Show less' : 'Show details'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-2 text-xs text-slate-300">
          <div className="flex justify-between">
            <span>Route ID:</span>
            <code className="text-slate-400">{route.id.slice(0, 8)}</code>
          </div>
          <div className="flex justify-between">
            <span>Exact distance:</span>
            <span>{(route.distance_m).toLocaleString()} m</span>
          </div>
          <div className="flex justify-between">
            <span>Exact duration:</span>
            <span>{route.duration_seconds} s</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MD3RoutePlannerCard;
