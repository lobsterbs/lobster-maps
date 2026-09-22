/**
 * Material Design 3 Enhanced Route Selector Card
 * Risk factor display, current location awareness, smart metrics
 */

import React, { useState, CSSProperties } from 'react';
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
import { MD3Button } from './MD3Button';
import { SPACING, GAP, CARD_PADDING } from '../styles/spacing';

export interface RouteWithRisk {
  id: string;
  type: 'fastest' | 'safest' | 'scenic';
  distance_km: number;
  duration_min: number;
  elevation_m: number;
  safety_score: number;
  weather_risk: 'clear' | 'rain' | 'snow' | 'wind';
  weather_risk_level: number;
  toll_cost_nok?: number;
  speed_cameras_count: number;
  scenic_score: number;
  traffic_level: 'light' | 'moderate' | 'heavy';
}

interface MD3EnhancedRouteSelectorCardProps {
  routes: RouteWithRisk[];
  selectedId?: string;
  currentLocation?: [number, number];
  onSelect?: (id: string) => void;
  onNavigate?: (id: string) => void;
}

const getTypeColor = (type: string): { bg: string; text: string; border: string } => {
  switch (type) {
    case 'fastest':
      return { bg: 'rgba(255, 184, 115, 0.12)', text: 'var(--md-sys-color-tertiary)', border: 'var(--md-sys-color-tertiary)' };
    case 'safest':
      return { bg: 'rgba(16, 185, 129, 0.12)', text: 'var(--md-sys-color-primary)', border: 'var(--md-sys-color-primary)' };
    case 'scenic':
      return { bg: 'rgba(106, 90, 205, 0.12)', text: 'var(--md-sys-color-secondary)', border: 'var(--md-sys-color-secondary)' };
    default:
      return { bg: 'var(--md-sys-color-surface-container)', text: 'var(--md-sys-color-on-surface)', border: 'var(--md-sys-color-outline-variant)' };
  }
};

const getTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    fastest: <Zap size={20} />,
    safest: <Shield size={20} />,
    scenic: <TrendingUp size={20} />,
  };
  return icons[type] || icons.fastest;
};

const getRiskColor = (score: number): { bg: string; text: string; border: string } => {
  if (score >= 75) return { bg: 'rgba(16, 185, 129, 0.12)', text: 'var(--md-sys-color-primary)', border: 'var(--md-sys-color-primary)' };
  if (score >= 50) return { bg: 'rgba(106, 90, 205, 0.12)', text: 'var(--md-sys-color-secondary)', border: 'var(--md-sys-color-secondary)' };
  return { bg: 'rgba(220, 38, 38, 0.12)', text: 'var(--md-sys-color-error)', border: 'var(--md-sys-color-error)' };
};

const getRiskLabel = (score: number) => {
  if (score >= 75) return 'Safe';
  if (score >= 50) return 'Caution';
  return 'High Risk';
};

export const MD3EnhancedRouteSelectorCard: React.FC<
  MD3EnhancedRouteSelectorCardProps
> = ({ routes, selectedId, currentLocation, onSelect, onNavigate }) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: GAP.sm,
  };

  const routeButtonStyle = (isSelected: boolean, typeColor: ReturnType<typeof getTypeColor>): CSSProperties => ({
    width: '100%',
    textAlign: 'left',
    backgroundColor: typeColor.bg,
    border: `2px solid ${typeColor.border}`,
    borderRadius: '16px',
    padding: CARD_PADDING.standard,
    cursor: 'pointer',
    transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
    boxShadow: isSelected ? 'var(--md-sys-elevation-shadow-3)' : 'var(--md-sys-elevation-shadow-1)',
    outline: 'none',
  });

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  };

  const iconBoxStyle = (color: string): CSSProperties => ({
    padding: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const titleStyle = (color: string): CSSProperties => ({
    fontWeight: 700,
    fontSize: '16px',
    color: color,
    textTransform: 'capitalize',
    margin: 0,
  });

  const subtitleStyle: CSSProperties = {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
  };

  const metricsGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '12px',
  };

  const metricStyle: CSSProperties = {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: 'rgba(15, 15, 15, 0.04)',
    borderRadius: '8px',
  };

  const metricValueStyle: CSSProperties = {
    fontWeight: 700,
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface)',
  };

  const metricLabelStyle: CSSProperties = {
    fontSize: '11px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const riskBadgeStyle = (riskColor: ReturnType<typeof getRiskColor>): CSSProperties => ({
    display: 'inline-block',
    backgroundColor: riskColor.bg,
    color: riskColor.text,
    border: `1px solid ${riskColor.border}`,
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
  });

  const detailsStyle = (isExpanded: boolean): CSSProperties => ({
    display: isExpanded ? 'flex' : 'none',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: `1px solid rgba(15, 15, 15, 0.12)`,
  });

  const detailRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'var(--md-sys-color-on-surface)',
  };

  const detailLabelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--md-sys-color-on-surface-variant)',
  };

  return (
    <div style={containerStyle}>
      {routes.map((route) => {
        const isSelected = selectedId === route.id;
        const isExpanded = expanded === route.id;
        const typeColor = getTypeColor(route.type);
        const riskColor = getRiskColor(route.safety_score);
        const hours = Math.floor(route.duration_min / 60);
        const mins = route.duration_min % 60;
        const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        return (
          <button
            key={route.id}
            onClick={() => onSelect?.(route.id)}
            style={routeButtonStyle(isSelected, typeColor)}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-shadow-4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = isSelected ? 'var(--md-sys-elevation-shadow-3)' : 'var(--md-sys-elevation-shadow-1)';
            }}
          >
            {/* Header */}
            <div style={headerStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={iconBoxStyle(typeColor.text)}>
                  {getTypeIcon(route.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={titleStyle(typeColor.text)}>{route.type}</h3>
                  <p style={subtitleStyle}>
                    {route.type === 'fastest'
                      ? 'Quickest route'
                      : route.type === 'safest'
                      ? 'Lowest risk'
                      : 'Most scenic'}
                  </p>
                </div>
              </div>
              {isSelected && <ChevronRight size={24} style={{ color: typeColor.text }} />}
            </div>

            {/* Metrics */}
            <div style={metricsGridStyle}>
              <div style={metricStyle}>
                <div style={metricValueStyle}>{route.distance_km}</div>
                <div style={metricLabelStyle}>km</div>
              </div>
              <div style={metricStyle}>
                <div style={metricValueStyle}>{durationStr}</div>
                <div style={metricLabelStyle}>Time</div>
              </div>
              <div style={metricStyle}>
                <div style={metricValueStyle}>{route.elevation_m}</div>
                <div style={metricLabelStyle}>m Elev</div>
              </div>
            </div>

            {/* Risk Badge */}
            <div style={{ marginBottom: '12px' }}>
              <span style={riskBadgeStyle(riskColor)}>
                {getRiskLabel(route.safety_score)} ({route.safety_score}%)
              </span>
            </div>

            {/* Expandable Details */}
            <div style={detailsStyle(isExpanded)}>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>
                  <Cloud size={14} />
                  Weather Risk
                </span>
                <span>{route.weather_risk_level}%</span>
              </div>
              {route.toll_cost_nok && (
                <div style={detailRowStyle}>
                  <span style={detailLabelStyle}>
                    <DollarSign size={14} />
                    Toll Cost
                  </span>
                  <span>{route.toll_cost_nok} NOK</span>
                </div>
              )}
              {route.speed_cameras_count > 0 && (
                <div style={detailRowStyle}>
                  <span style={detailLabelStyle}>
                    <AlertTriangle size={14} />
                    Speed Cameras
                  </span>
                  <span>{route.speed_cameras_count}</span>
                </div>
              )}
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Traffic</span>
                <span style={{ textTransform: 'capitalize' }}>{route.traffic_level}</span>
              </div>
            </div>

            {/* Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(isExpanded ? null : route.id);
              }}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: `1px solid ${typeColor.border}`,
                color: typeColor.text,
                padding: '8px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '12px',
                transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = typeColor.bg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {isExpanded ? 'Hide details' : 'Show details'}
            </button>

            {/* Navigate Button */}
            {isSelected && (
              <MD3Button
                variant="filled"
                size="large"
                onClick={() => onNavigate?.(route.id)}
                fullWidth
              >
                Start Navigation
              </MD3Button>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MD3EnhancedRouteSelectorCard;
