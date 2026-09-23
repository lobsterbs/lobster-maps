/**
 * Material Design 3 Bergen Features Cards
 * Toll info, Speed cameras, Bike routes, Park & Ride
 */

import React, { CSSProperties } from 'react';
import { AlertTriangle, Bike, Car, MapPin } from 'lucide-react';

// Toll Card
interface TollInfo {
  id: string;
  road: string;
  cost_nok: number;
  payment_methods: string[];
}

export const MD3TollCard: React.FC<{ toll: TollInfo }> = ({ toll }) => {
  const cardStyle: CSSProperties = {
    backgroundColor: 'rgba(106, 90, 205, 0.08)',
    border: `1px solid var(--md-sys-color-secondary)`,
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  };

  const iconStyle: CSSProperties = {
    color: 'var(--md-sys-color-secondary)',
    marginTop: '2px',
    flexShrink: 0,
  };

  const titleStyle: CSSProperties = {
    fontWeight: 600,
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
  };

  const costStyle: CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--md-sys-color-secondary)',
    marginTop: '8px',
  };

  const methodsStyle: CSSProperties = {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  return (
    <div style={cardStyle}>
      <AlertTriangle size={20} style={iconStyle} />
      <div style={{ flex: 1 }}>
        <h3 style={titleStyle}>{toll.road} Toll</h3>
        <div style={costStyle}>{toll.cost_nok} NOK</div>
        <div style={methodsStyle}>
          {toll.payment_methods.map((method) => (
            <div key={method}>• {method}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Speed Camera Alert Card
interface SpeedCameraAlert {
  id: string;
  road: string;
  limit_kmh: number;
  distance_m: number;
}

export const MD3SpeedCameraCard: React.FC<{ camera: SpeedCameraAlert }> = ({ camera }) => {
  const cardStyle: CSSProperties = {
    backgroundColor: 'var(--md-sys-state-error-hover)',
    border: `1px solid var(--md-sys-color-error)`,
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  };

  const iconStyle: CSSProperties = {
    color: 'var(--md-sys-color-error)',
    marginTop: '2px',
    flexShrink: 0,
  };

  const titleStyle: CSSProperties = {
    fontWeight: 600,
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
  };

  const roadStyle: CSSProperties = {
    fontSize: '13px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '4px',
  };

  const detailsStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '8px',
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
  };

  return (
    <div style={cardStyle}>
      <AlertTriangle size={20} style={iconStyle} />
      <div style={{ flex: 1 }}>
        <h3 style={titleStyle}>Speed Camera Ahead</h3>
        <p style={roadStyle}>{camera.road}</p>
        <div style={detailsStyle}>
          <div>{camera.limit_kmh} km/h</div>
          <div>{camera.distance_m} m away</div>
        </div>
      </div>
    </div>
  );
};

// Bike Route Card
interface BikeRoute {
  id: string;
  name: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  distance_km: number;
}

export const MD3BikeRouteCard: React.FC<{ route: BikeRoute }> = ({ route }) => {
  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return 'var(--md-sys-color-primary)';
      case 'moderate':
        return 'var(--md-sys-color-secondary)';
      case 'hard':
        return 'var(--md-sys-color-tertiary)';
      default:
        return 'var(--md-sys-color-on-surface-variant)';
    }
  };

  const cardStyle: CSSProperties = {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    border: `1px solid var(--md-sys-color-outline-variant)`,
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  };

  const iconStyle: CSSProperties = {
    color: getDifficultyColor(route.difficulty),
    marginTop: '2px',
    flexShrink: 0,
  };

  const titleStyle: CSSProperties = {
    fontWeight: 600,
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
  };

  const detailsStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '4px',
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
  };

  const badgeStyle: CSSProperties = {
    backgroundColor: getDifficultyColor(route.difficulty),
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'capitalize',
  };

  return (
    <div style={cardStyle}>
      <Bike size={20} style={iconStyle} />
      <div style={{ flex: 1 }}>
        <h3 style={titleStyle}>{route.name}</h3>
        <div style={detailsStyle}>
          <div>{route.distance_km} km</div>
          <div style={badgeStyle}>{route.difficulty}</div>
        </div>
      </div>
    </div>
  );
};

// Park & Ride Card
interface ParkAndRide {
  id: string;
  name: string;
  location: string;
  capacity: number;
  occupied: number;
  price_per_hour_nok: number;
}

export const MD3ParkAndRideCard: React.FC<{ facility: ParkAndRide }> = ({ facility }) => {
  const occupancy = Math.round((facility.occupied / facility.capacity) * 100);

  const cardStyle: CSSProperties = {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    border: `1px solid var(--md-sys-color-outline-variant)`,
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  };

  const iconStyle: CSSProperties = {
    color: 'var(--md-sys-color-primary)',
    marginTop: '2px',
    flexShrink: 0,
  };

  const titleStyle: CSSProperties = {
    fontWeight: 600,
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
  };

  const locationStyle: CSSProperties = {
    fontSize: '13px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '4px',
  };

  const detailsStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: '8px',
    fontSize: '12px',
  };

  const priceStyle: CSSProperties = {
    color: 'var(--md-sys-color-primary)',
    fontWeight: 600,
  };

  const occupancyBarStyle: CSSProperties = {
    width: '100%',
    height: '4px',
    backgroundColor: 'var(--md-sys-color-outline-variant)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '4px',
  };

  const occupancyFillStyle: CSSProperties = {
    height: '100%',
    width: `${occupancy}%`,
    backgroundColor: occupancy > 80 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)',
    transition: 'width var(--app-duration-short2) var(--app-ease-standard)',
  };

  return (
    <div style={cardStyle}>
      <MapPin size={20} style={iconStyle} />
      <div style={{ flex: 1 }}>
        <h3 style={titleStyle}>{facility.name}</h3>
        <p style={locationStyle}>{facility.location}</p>
        <div style={occupancyBarStyle}>
          <div style={occupancyFillStyle} />
        </div>
        <div style={detailsStyle}>
          <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            {facility.occupied}/{facility.capacity} spaces
          </span>
          <span style={priceStyle}>{facility.price_per_hour_nok} NOK/h</span>
        </div>
      </div>
    </div>
  );
};

export default {
  MD3TollCard,
  MD3SpeedCameraCard,
  MD3BikeRouteCard,
  MD3ParkAndRideCard,
};
