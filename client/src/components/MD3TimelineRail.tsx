/**
 * Material Design 3 Timeline Rail
 * Display journey steps (transit legs, waypoints)
 * Vertical timeline with step markers and timing
 */

import React from 'react';
import { MapPin, Clock, Bus, Navigation } from 'lucide-react';

export interface JourneyStep {
  id: string;
  type: 'start' | 'transit' | 'waypoint' | 'end';
  name: string;
  time?: string;
  duration_min?: number;
  instruction?: string;
  icon?: React.ReactNode;
}

interface MD3TimelineRailProps {
  steps: JourneyStep[];
  activeStepId?: string;
  onStepClick?: (id: string) => void;
}

export const MD3TimelineRail: React.FC<MD3TimelineRailProps> = ({
  steps,
  activeStepId,
  onStepClick,
}) => {
  const getIcon = (step: JourneyStep) => {
    if (step.icon) return step.icon;
    
    const iconProps = { size: 20, className: 'text-slate-300' };
    switch (step.type) {
      case 'start':
        return <MapPin {...iconProps} className="text-emerald-400" />;
      case 'transit':
        return <Bus {...iconProps} className="text-sky-400" />;
      case 'waypoint':
        return <Navigation {...iconProps} className="text-orange-400" />;
      case 'end':
        return <MapPin {...iconProps} className="text-emerald-400" />;
      default:
        return <MapPin {...iconProps} />;
    }
  };

  const getStepColor = (type: string) => {
    const colors: Record<string, string> = {
      start: 'bg-emerald-500',
      transit: 'bg-sky-500',
      waypoint: 'bg-orange-500',
      end: 'bg-emerald-500',
    };
    return colors[type] || 'bg-slate-500';
  };

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const isActive = activeStepId === step.id;
        const isLast = idx === steps.length - 1;
        const stepColor = getStepColor(step.type);

        return (
          <button
            key={step.id}
            onClick={() => onStepClick?.(step.id)}
            className={`w-full flex gap-4 px-4 py-3 text-left transition-colors ${
              isActive ? 'bg-slate-700 bg-opacity-50' : 'hover:bg-slate-700 hover:bg-opacity-30'
            }`}
          >
            {/* Timeline connector */}
            <div className="flex flex-col items-center pt-1">
              {/* Circle marker */}
              <div
                className={`w-8 h-8 rounded-full ${stepColor} flex items-center justify-center shadow-lg`}
              >
                {getIcon(step)}
              </div>
              {/* Vertical line (except for last item) */}
              {!isLast && (
                <div className={`w-0.5 h-12 mt-2 ${stepColor} opacity-30`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1 min-w-0">
              <h3 className="font-semibold text-slate-100 truncate">{step.name}</h3>
              
              {step.time && (
                <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                  <Clock size={14} />
                  <span>{step.time}</span>
                </div>
              )}

              {step.instruction && (
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{step.instruction}</p>
              )}

              {step.duration_min && (
                <div className="text-xs text-slate-500 mt-2">
                  {step.duration_min} min
                </div>
              )}
            </div>

            {/* Right indicator */}
            {isActive && (
              <div className="flex items-center">
                <div className="w-1 h-8 bg-emerald-400 rounded-full" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MD3TimelineRail;
