/**
 * Material Design 3 Travel Route Card
 * Display multiple route alternatives (Pareto variants)
 * Each route optimizes for different criteria: speed, safety, scenic
 */

import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Heart } from 'lucide-react';

export interface RouteVariant {
  id: string;
  type: 'fastest' | 'safest' | 'scenic';
  distance_km: number;
  duration_min: number;
  safety_score: number; // 0-100
  scenic_score: number; // 0-100
  elevation_m: number;
}

interface MD3TravelRouteCardProps {
  routes: RouteVariant[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onSave?: (id: string) => void;
}

export const MD3TravelRouteCard: React.FC<MD3TravelRouteCardProps> = ({
  routes,
  selectedId,
  onSelect,
  onSave,
}) => {
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { label: string; emoji: string }> = {
      fastest: { label: 'Fastest', emoji: '⚡' },
      safest: { label: 'Safest', emoji: '🛡️' },
      scenic: { label: 'Scenic', emoji: '🌄' },
    };
    return labels[type] || { label: type, emoji: '📍' };
  };

  const toggleLike = (id: string) => {
    const newLiked = new Set(liked);
    if (newLiked.has(id)) {
      newLiked.delete(id);
    } else {
      newLiked.add(id);
    }
    setLiked(newLiked);
  };

  return (
    <div className="space-y-2">
      {routes.map((route, idx) => {
        const { label, emoji } = getTypeLabel(route.type);
        const isSelected = selectedId === route.id;
        const isLiked = liked.has(route.id);

        return (
          <button
            key={route.id}
            onClick={() => onSelect?.(route.id)}
            className={`w-full text-left md-card transition-all ${
              isSelected
                ? 'ring-2 ring-emerald-500 bg-emerald-900 bg-opacity-10'
                : 'hover:bg-slate-700 hover:bg-opacity-20'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Title with icon */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{emoji}</span>
                  <h3 className="font-semibold">{label}</h3>
                  {isSelected && (
                    <CheckCircle2 size={16} className="text-emerald-400 ml-auto" />
                  )}
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                  <div className="text-slate-300">
                    <div className="text-emerald-400 font-bold">{route.distance_km}</div>
                    <div className="text-xs text-slate-500">km</div>
                  </div>
                  <div className="text-slate-300">
                    <div className="text-sky-400 font-bold">{route.duration_min}m</div>
                    <div className="text-xs text-slate-500">time</div>
                  </div>
                </div>

                {/* Scores */}
                <div className="space-y-1 text-xs">
                  {/* Safety bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-12">Safety</span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-green-500"
                        style={{ width: `${route.safety_score}%` }}
                      />
                    </div>
                    <span className="text-slate-400 w-8 text-right">{route.safety_score}</span>
                  </div>

                  {/* Scenic bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-12">Scenic</span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-slate-500 to-cyan-500"
                        style={{ width: `${route.scenic_score}%` }}
                      />
                    </div>
                    <span className="text-slate-400 w-8 text-right">{route.scenic_score}</span>
                  </div>
                </div>
              </div>

              {/* Like button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike(route.id);
                }}
                className="ml-2 p-2 hover:bg-slate-600 rounded-full transition-colors"
              >
                <Heart
                  size={20}
                  className={isLiked ? 'text-red-500 fill-red-500' : 'text-slate-400'}
                />
              </button>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MD3TravelRouteCard;
