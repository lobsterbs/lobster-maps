/**
 * Material Design 3 Bergen Features Cards
 * Toll info, Speed cameras, Bike routes, Park & Ride
 */

import React from 'react';
import { AlertTriangle, Bike, Car, MapPin } from 'lucide-react';

// Toll Card
interface TollInfo {
  id: string;
  road: string;
  cost_nok: number;
  payment_methods: string[];
}

export const MD3TollCard: React.FC<{ toll: TollInfo }> = ({ toll }) => (
  <div className="md-card bg-orange-900 bg-opacity-20 border border-orange-700">
    <div className="flex items-start gap-3">
      <AlertTriangle size={20} className="text-orange-400 mt-1 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="font-semibold text-orange-100">{toll.road} Toll</h3>
        <div className="text-2xl font-bold text-orange-300 mt-1">{toll.cost_nok} NOK</div>
        <div className="text-xs text-orange-200 mt-2 space-y-1">
          {toll.payment_methods.map((method) => (
            <div key={method}>• {method}</div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Speed Camera Alert Card
interface SpeedCameraAlert {
  id: string;
  road: string;
  limit_kmh: number;
  distance_m: number;
}

export const MD3SpeedCameraCard: React.FC<{ camera: SpeedCameraAlert }> = ({ camera }) => (
  <div className="md-card bg-red-900 bg-opacity-20 border border-red-700">
    <div className="flex items-start gap-3">
      <AlertTriangle size={20} className="text-red-400 mt-1 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="font-semibold text-red-100">Speed Camera Ahead</h3>
        <p className="text-sm text-red-200 mt-1">{camera.road}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-red-200">
          <div>
            <div className="text-red-300 font-bold">{camera.limit_kmh}</div>
            <div>km/h limit</div>
          </div>
          <div>
            <div className="text-red-300 font-bold">{(camera.distance_m / 1000).toFixed(1)}</div>
            <div>km ahead</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Bike Route Card
interface BikeRouteInfo {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  distance_km: number;
  elevation_m: number;
}

export const MD3BikeRouteCard: React.FC<{ route: BikeRouteInfo }> = ({ route }) => {
  const difficultyColor: Record<string, string> = {
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-red-500',
  };

  return (
    <div className="md-card bg-emerald-900 bg-opacity-20 border border-emerald-700">
      <div className="flex items-start gap-3">
        <Bike size={20} className="text-emerald-400 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-emerald-100">{route.name}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${difficultyColor[route.difficulty]}`}>
              {route.difficulty}
            </span>
            <span className="text-sm text-emerald-200">{route.distance_km} km</span>
            <span className="text-sm text-emerald-200">+{route.elevation_m}m</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Park & Ride Card
interface ParkAndRideInfo {
  id: string;
  name: string;
  available_spaces: number;
  total_capacity: number;
  transit_lines: string[];
}

export const MD3ParkAndRideCard: React.FC<{ station: ParkAndRideInfo }> = ({ station }) => {
  const occupancy = (station.total_capacity - station.available_spaces) / station.total_capacity;
  const availablePercent = (station.available_spaces / station.total_capacity) * 100;

  return (
    <div className="md-card bg-sky-900 bg-opacity-20 border border-sky-700">
      <div className="flex items-start gap-3">
        <Car size={20} className="text-sky-400 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-sky-100">{station.name}</h3>
          
          {/* Capacity bar */}
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs text-sky-200">
              <span>Availability</span>
              <span className="font-bold">{station.available_spaces}/{station.total_capacity}</span>
            </div>
            <div className="h-2 bg-sky-900 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  availablePercent > 30 ? 'bg-emerald-500' : 
                  availablePercent > 10 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ width: `${availablePercent}%` }}
              />
            </div>
          </div>

          {/* Transit lines */}
          <div className="flex flex-wrap gap-1 mt-2">
            {station.transit_lines.map((line) => (
              <span key={line} className="px-2 py-0.5 bg-sky-700 text-xs text-sky-100 rounded">
                Line {line}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Speed Indicator Card
interface SpeedIndicator {
  current_kmh: number;
  limit_kmh: number;
  location: string;
}

export const MD3SpeedIndicatorCard: React.FC<{ speed: SpeedIndicator }> = ({ speed }) => {
  const isOverLimit = speed.current_kmh > speed.limit_kmh;
  const difference = Math.abs(speed.current_kmh - speed.limit_kmh);

  return (
    <div className={`md-card ${isOverLimit ? 'bg-red-900 bg-opacity-20 border border-red-700' : 'bg-slate-800'}`}>
      <div className="text-center">
        <div className="text-4xl font-bold text-sky-400">{speed.current_kmh}</div>
        <div className="text-sm text-slate-400">km/h</div>
        {isOverLimit && (
          <div className="mt-2 text-red-300 text-sm font-semibold">
            +{difference} over limit ({speed.limit_kmh} km/h)
          </div>
        )}
        {!isOverLimit && (
          <div className="mt-2 text-emerald-300 text-sm font-semibold">
            {difference} under limit
          </div>
        )}
        <div className="text-xs text-slate-400 mt-2">{speed.location}</div>
      </div>
    </div>
  );
};

export default {
  MD3TollCard,
  MD3SpeedCameraCard,
  MD3BikeRouteCard,
  MD3ParkAndRideCard,
  MD3SpeedIndicatorCard,
};
