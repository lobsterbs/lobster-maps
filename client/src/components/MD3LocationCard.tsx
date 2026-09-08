/**
 * Material Design 3 Location Card
 * Display origin or destination with address, coordinates, etc.
 */

import React from 'react';
import { MapPin, Clock, AlertCircle } from 'lucide-react';

export interface LocationData {
  id: string;
  name: string;
  address?: string;
  coordinates: [number, number];
  type: 'origin' | 'destination';
  recentlyUsed?: boolean;
  arrival_time?: string;
  note?: string;
}

interface MD3LocationCardProps {
  location: LocationData;
  onEdit?: () => void;
  onClear?: () => void;
  showDetails?: boolean;
}

export const MD3LocationCard: React.FC<MD3LocationCardProps> = ({
  location,
  onEdit,
  onClear,
  showDetails = false,
}) => {
  const [lat, lng] = location.coordinates;

  return (
    <div className="md-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <MapPin
            size={20}
            className={
              location.type === 'origin'
                ? 'text-emerald-400 mt-1'
                : 'text-slate-400 mt-1'
            }
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-100 truncate">{location.name}</h3>
            {location.address && (
              <p className="text-sm text-slate-400 truncate">{location.address}</p>
            )}
            {location.recentlyUsed && (
              <div className="text-xs text-emerald-400 mt-1">Recently used</div>
            )}
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-slate-400 hover:text-slate-200 px-2"
        >
          ✕
        </button>
      </div>

      {showDetails && (
        <div className="space-y-2 pt-3 border-t border-slate-700">
          <div className="text-xs text-slate-400 space-y-1">
            <div>
              <span className="text-slate-500">Coordinates:</span> {lat.toFixed(4)}, {lng.toFixed(4)}
            </div>
            {location.arrival_time && (
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>Arrival: {location.arrival_time}</span>
              </div>
            )}
            {location.note && (
              <div className="flex items-start gap-1">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                <span className="text-slate-300">{location.note}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {onEdit && (
        <button
          onClick={onEdit}
          className="w-full mt-3 py-2 text-sm text-emerald-400 hover:text-emerald-300 rounded transition-colors"
        >
          Edit location
        </button>
      )}
    </div>
  );
};

export default MD3LocationCard;
