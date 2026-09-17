/**
 * Material Design 3 Timeline Rail
 * Display journey steps (transit legs, waypoints)
 * Vertical timeline with step markers and timing
 */

import React, { CSSProperties } from 'react';
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
    
    const getIconColor = (type: string): string => {
      switch (type) {
        case 'start':
        case 'end':
          return 'var(--md-sys-color-primary)';
        case 'transit':
          return 'var(--md-sys-color-tertiary)';
        case 'waypoint':
          return 'var(--md-sys-color-secondary)';
        default:
          return 'var(--md-sys-color-on-surface-variant)';
      }
    };

    const iconProps = { size: 20, style: { color: getIconColor(step.type) } };
    switch (step.type) {
      case 'start':
      case 'end':
        return <MapPin {...iconProps} />;
      case 'transit':
        return <Bus {...iconProps} />;
      case 'waypoint':
        return <Navigation {...iconProps} />;
      default:
        return <MapPin {...iconProps} />;
    }
  };

  const getStepColor = (type: string): string => {
    const colors: Record<string, string> = {
      start: 'var(--md-sys-color-primary)',
      transit: 'var(--md-sys-color-tertiary)',
      waypoint: 'var(--md-sys-color-secondary)',
      end: 'var(--md-sys-color-primary)',
    };
    return colors[type] || 'var(--md-sys-color-outline)';
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  };

  const stepStyle = (isActive: boolean): CSSProperties => ({
    display: 'flex',
    gap: '12px',
    padding: '12px',
    cursor: 'pointer',
    backgroundColor: isActive ? 'var(--md-sys-color-surface-container-high)' : 'transparent',
    transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
    borderRadius: '8px',
  });

  const timelineStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  };

  const markerStyle = (isActive: boolean): CSSProperties => ({
    width: isActive ? '28px' : '20px',
    height: isActive ? '28px' : '20px',
    borderRadius: '50%',
    backgroundColor: 'var(--md-sys-color-surface)',
    border: `2px solid var(--md-sys-color-primary)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
  });

  const connectorStyle: CSSProperties = {
    width: '2px',
    height: '24px',
    backgroundColor: 'var(--md-sys-color-outline-variant)',
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyle: CSSProperties = {
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
  };

  const instructionStyle: CSSProperties = {
    fontSize: '13px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '4px 0 0 0',
  };

  const metaStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
  };

  return (
    <div style={containerStyle}>
      {steps.map((step, idx) => {
        const isActive = activeStepId === step.id;
        const isLast = idx === steps.length - 1;

        return (
          <div
            key={step.id}
            style={stepStyle(isActive)}
            onClick={() => onStepClick?.(step.id)}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, var(--md-sys-state-hover-opacity))';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div style={timelineStyle}>
              <div style={markerStyle(isActive)}>
                {getIcon(step)}
              </div>
              {!isLast && <div style={connectorStyle} />}
            </div>

            <div style={contentStyle}>
              <h3 style={titleStyle}>{step.name}</h3>
              {step.instruction && <p style={instructionStyle}>{step.instruction}</p>}
              {(step.time || step.duration_min) && (
                <div style={metaStyle}>
                  {step.time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {step.time}
                    </div>
                  )}
                  {step.duration_min && (
                    <div>{step.duration_min} min</div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MD3TimelineRail;
