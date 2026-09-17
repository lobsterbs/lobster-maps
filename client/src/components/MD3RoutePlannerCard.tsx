/**
 * Material Design 3 Route Planner Card
 * Primary route display with distance, duration, elevation
 */

import React, { useState, CSSProperties } from 'react';
import { MapPin, Clock, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import { MD3Button } from './MD3Button';

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
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const cardStyle: CSSProperties = {
    backgroundColor: isPrimary ? 'var(--md-sys-color-surface-container-high)' : 'var(--md-sys-color-surface-container)',
    borderRadius: '12px',
    padding: '16px',
    border: `1px solid var(--md-sys-color-outline-variant)`,
    boxShadow: isPrimary ? 'var(--md-sys-elevation-shadow-2)' : 'var(--md-sys-elevation-shadow-1)',
    transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
    gap: '12px',
  };

  const locationsStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const locationRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  };

  const originIconStyle: CSSProperties = {
    color: 'var(--md-sys-color-primary)',
    flexShrink: 0,
  };

  const destIconStyle: CSSProperties = {
    color: 'var(--md-sys-color-on-surface-variant)',
    flexShrink: 0,
  };

  const metricsStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: `1px solid var(--md-sys-color-outline-variant)`,
  };

  const metricStyle: CSSProperties = {
    textAlign: 'center',
  };

  const metricValueStyle: CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--md-sys-color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  };

  const metricLabelStyle: CSSProperties = {
    fontSize: '11px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const detailsStyle: CSSProperties = {
    display: expanded ? 'flex' : 'none',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: `1px solid var(--md-sys-color-outline-variant)`,
  };

  const detailRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
  };

  const detailLabelStyle: CSSProperties = {
    color: 'var(--md-sys-color-on-surface-variant)',
  };

  const detailValueStyle: CSSProperties = {
    color: 'var(--md-sys-color-on-surface)',
    fontWeight: 500,
  };

  const warningStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderRadius: '8px',
    padding: '8px 12px',
    border: `1px solid var(--md-sys-color-error)`,
    marginBottom: '12px',
  };

  const warningIconStyle: CSSProperties = {
    color: 'var(--md-sys-color-error)',
    flexShrink: 0,
    marginTop: '2px',
  };

  const warningTextStyle: CSSProperties = {
    fontSize: '12px',
    color: 'var(--md-sys-color-error)',
  };

  const expandButtonStyle: CSSProperties = {
    width: '100%',
    backgroundColor: 'transparent',
    border: `1px solid var(--md-sys-color-outline-variant)`,
    color: 'var(--md-sys-color-on-surface)',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    marginBottom: '12px',
    transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={locationsStyle}>
          <div style={locationRowStyle}>
            <MapPin size={16} style={originIconStyle} />
            <span style={{ color: 'var(--md-sys-color-on-surface)' }}>{origin}</span>
          </div>
          <div style={locationRowStyle}>
            <MapPin size={16} style={destIconStyle} />
            <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{destination}</span>
          </div>
        </div>
        <MD3Button
          variant="filled"
          size="medium"
          onClick={() => onNavigate?.()}
          disabled={isLoading}
        >
          {isLoading ? 'Computing...' : 'Navigate'}
        </MD3Button>
      </div>

      {/* Key metrics */}
      <div style={metricsStyle}>
        <div style={metricStyle}>
          <div style={metricValueStyle}>{distance_km}</div>
          <div style={metricLabelStyle}>km</div>
        </div>
        <div style={metricStyle}>
          <div style={metricValueStyle}>
            <Clock size={18} />
            {durationStr}
          </div>
          <div style={metricLabelStyle}>Duration</div>
        </div>
        <div style={metricStyle}>
          <div style={metricValueStyle}>
            <TrendingUp size={18} />
            {route.elevation_m}
          </div>
          <div style={metricLabelStyle}>m Elevation</div>
        </div>
      </div>

      {/* Details (expandable) */}
      <div style={detailsStyle}>
        {route.toll_cost_nok && (
          <div style={detailRowStyle}>
            <span style={detailLabelStyle}>Toll cost:</span>
            <span style={detailValueStyle}>{route.toll_cost_nok} NOK</span>
          </div>
        )}
        {route.speed_cameras && route.speed_cameras.length > 0 && (
          <div style={detailRowStyle}>
            <span style={detailLabelStyle}>Speed cameras:</span>
            <span style={detailValueStyle}>{route.speed_cameras.length}</span>
          </div>
        )}
      </div>

      {/* Warnings */}
      {route.toll_cost_nok && route.toll_cost_nok > 100 && (
        <div style={warningStyle}>
          <AlertCircle size={16} style={warningIconStyle} />
          <span style={warningTextStyle}>High toll cost ({route.toll_cost_nok} NOK)</span>
        </div>
      )}

      {/* Expand button */}
      <button
        style={expandButtonStyle}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        {expanded ? 'Hide details' : 'Show details'}
      </button>
    </div>
  );
};

export default MD3RoutePlannerCard;
