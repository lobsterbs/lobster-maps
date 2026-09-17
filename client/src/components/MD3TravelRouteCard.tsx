/**
 * Material Design 3 Travel Route Card
 * Displays different route options with comparison metrics
 */

import React, { useState, CSSProperties } from 'react';
import { CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

export interface RouteOption {
  id: string;
  label: string;
  emoji: string;
  route: {
    distance_km: number;
    duration_min: number;
    safety_score: number;
    scenic_score: number;
    toll_cost_nok?: number;
  };
  isSelected?: boolean;
  onSelect?: () => void;
}

interface MD3TravelRouteCardProps {
  routes: RouteOption[];
  activeRouteId?: string;
  onRouteSelect?: (routeId: string) => void;
}

export const MD3TravelRouteCard: React.FC<MD3TravelRouteCardProps> = ({
  routes,
  activeRouteId,
  onRouteSelect,
}) => {
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const routeButtonStyle = (isActive: boolean): CSSProperties => ({
    width: '100%',
    textAlign: 'left',
    backgroundColor: isActive ? 'var(--md-sys-color-surface-container-high)' : 'var(--md-sys-color-surface-container)',
    border: isActive ? `2px solid var(--md-sys-color-primary)` : `1px solid var(--md-sys-color-outline-variant)`,
    borderRadius: '12px',
    padding: '12px',
    cursor: 'pointer',
    transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
    boxShadow: isActive ? 'var(--md-sys-elevation-shadow-2)' : 'var(--md-sys-elevation-shadow-1)',
  });

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '8px',
  };

  const labelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  };

  const emojiStyle: CSSProperties = {
    fontSize: '18px',
  };

  const titleStyle: CSSProperties = {
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface)',
  };

  const metricsStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '8px',
  };

  const metricStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  const metricValueStyle: CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--md-sys-color-primary)',
  };

  const metricLabelStyle: CSSProperties = {
    fontSize: '11px',
    color: 'var(--md-sys-color-on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const detailsStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
  };

  const detailRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const labelTextStyle: CSSProperties = {
    color: 'var(--md-sys-color-on-surface-variant)',
    width: '48px',
  };

  const progressBarStyle: CSSProperties = {
    flex: 1,
    height: '6px',
    backgroundColor: 'var(--md-sys-color-outline-variant)',
    borderRadius: '3px',
    overflow: 'hidden',
  };

  const progressFillStyle = (percentage: number): CSSProperties => ({
    height: '100%',
    width: `${percentage}%`,
    background: 'linear-gradient(90deg, #ef4444 0%, #10b981 100%)',
  });

  return (
    <div style={containerStyle}>
      {routes.map((route) => {
        const isActive = activeRouteId === route.id;
        return (
          <button
            key={route.id}
            style={routeButtonStyle(isActive)}
            onClick={() => onRouteSelect?.(route.id)}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
              }
            }}
          >
            {/* Header */}
            <div style={headerStyle}>
              <div style={labelStyle}>
                <span style={emojiStyle}>{route.emoji}</span>
                <h3 style={titleStyle}>{route.label}</h3>
              </div>
              {isActive && <CheckCircle2 size={20} style={{ color: 'var(--md-sys-color-primary)' }} />}
            </div>

            {/* Metrics Grid */}
            <div style={metricsStyle}>
              <div style={metricStyle}>
                <div style={metricValueStyle}>{route.route.distance_km}</div>
                <div style={metricLabelStyle}>km</div>
              </div>
              <div style={metricStyle}>
                <div style={metricValueStyle}>{route.route.duration_min}m</div>
                <div style={metricLabelStyle}>time</div>
              </div>
            </div>

            {/* Details */}
            <div style={detailsStyle}>
              <div style={detailRowStyle}>
                <span style={labelTextStyle}>Safety</span>
                <div style={progressBarStyle}>
                  <div style={progressFillStyle(route.route.safety_score)} />
                </div>
              </div>

              <div style={detailRowStyle}>
                <span style={labelTextStyle}>Scenic</span>
                <div style={progressBarStyle}>
                  <div style={progressFillStyle(route.route.scenic_score)} />
                </div>
              </div>

              {route.route.toll_cost_nok && route.route.toll_cost_nok > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  <AlertTriangle size={12} />
                  Toll: {route.route.toll_cost_nok} NOK
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MD3TravelRouteCard;
