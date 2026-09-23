/**
 * Material 3 Expressive FAB Menu
 * Floating action button with morphing submenu
 * https://m3.material.io/components/fab/specs
 *
 * Features:
 * - Primary FAB (56dp) morphs to show secondary actions
 * - Spring motion animation (350ms, fast-spatial)
 * - Scrim overlay (semi-transparent background)
 * - Individual FABs for each action (40dp secondary FABs)
 * - Optional labels
 * - Touch-first design (56dp minimum)
 * - State layers (hover, focus, pressed)
 */

import React, { CSSProperties, ReactNode, useState } from 'react';

export interface FABMenuAction {
  id: string;
  icon: ReactNode;
  label?: string;
  onClick?: () => void;
  destructive?: boolean;
}

export interface MD3FABMenuProps {
  icon: ReactNode; // Primary FAB icon
  label?: string; // Primary FAB label (shows when expanded)
  actions: FABMenuAction[]; // Secondary actions
  onActionClick?: (actionId: string) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'; // Default: bottom-right
  showLabels?: boolean; // Show action labels
  className?: string;
  style?: CSSProperties;
}

/**
 * Secondary FAB action button (40dp)
 */
const SecondaryFAB: React.FC<{
  action: FABMenuAction;
  showLabel?: boolean;
  onClick?: () => void;
}> = ({ action, showLabel, onClick }) => {
  const fabStyle: CSSProperties = {
    width: '40px',
    height: '40px',
    minWidth: '40px',
    minHeight: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--md-sys-color-secondary-container)',
    color: 'var(--md-sys-color-on-secondary-container)',
    border: 'none',
    boxShadow: 'var(--md-sys-elevation-3)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 200ms var(--md-sys-motion-spring-standard-spatial)',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {showLabel && action.label && (
        <span
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: 'var(--md-sys-elevation-1)',
          }}
        >
          {action.label}
        </span>
      )}
      <button
        style={fabStyle}
        className="md-fab-secondary"
        data-destructive={action.destructive}
        onClick={onClick}
        title={action.label}
      >
        {action.icon}
      </button>
    </div>
  );
};

/**
 * M3 FAB Menu (Floating Action Button with submenu)
 * Primary FAB expands to reveal secondary actions with smooth spring animation
 */
export const MD3FABMenu: React.FC<MD3FABMenuProps> = ({
  icon,
  label,
  actions,
  onActionClick,
  position = 'bottom-right',
  showLabels = true,
  className,
  style,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getPositionStyle = (): CSSProperties => {
    const baseStyle: CSSProperties = {
      position: 'fixed',
      zIndex: 1001,
    };

    switch (position) {
      case 'bottom-right':
        return { ...baseStyle, bottom: '24px', right: '24px' };
      case 'bottom-left':
        return { ...baseStyle, bottom: '24px', left: '24px' };
      case 'top-right':
        return { ...baseStyle, top: '24px', right: '24px' };
      case 'top-left':
        return { ...baseStyle, top: '24px', left: '24px' };
      default:
        return { ...baseStyle, bottom: '24px', right: '24px' };
    }
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '16px',
    ...getPositionStyle(),
    ...style,
  };

  const scrimStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    opacity: expanded ? 1 : 0,
    pointerEvents: expanded ? 'auto' : 'none',
    transition: 'opacity 200ms var(--md-sys-motion-spring-standard-spatial)',
    zIndex: 999,
  };

  const primaryFabStyle: CSSProperties = {
    width: '56px',
    height: '56px',
    minWidth: '56px',
    minHeight: '56px',
    borderRadius: '50%',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    boxShadow: 'var(--md-sys-elevation-3)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    transition: 'all 350ms var(--md-sys-motion-spring-fast-spatial)',
    transform: `scale(1) rotate(${expanded ? 45 : 0}deg)`,
  };

  const actionsContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: '16px',
    opacity: expanded ? 1 : 0,
    transform: expanded ? 'scaleY(1)' : 'scaleY(0)',
    transformOrigin: 'bottom center',
    transition: 'all 350ms var(--md-sys-motion-spring-fast-spatial)',
    pointerEvents: expanded ? 'auto' : 'none',
  };

  const handleActionClick = (actionId: string) => {
    onActionClick?.(actionId);
    const action = actions.find((a) => a.id === actionId);
    action?.onClick?.();
    setExpanded(false);
  };

  return (
    <div className={`md-fab-menu ${className || ''}`}>
      {/* Scrim overlay */}
      <div
        style={scrimStyle}
        onClick={() => setExpanded(false)}
        aria-hidden="true"
      />

      {/* FAB Menu container */}
      <div style={containerStyle} role="region" aria-label="Floating action button menu">
        {/* Secondary actions (below primary FAB) */}
        <div style={actionsContainerStyle}>
          {actions.map((action, index) => (
            <SecondaryFAB
              key={action.id}
              action={action}
              showLabel={showLabels}
              onClick={() => handleActionClick(action.id)}
            />
          ))}
        </div>

        {/* Primary FAB */}
        <button
          style={primaryFabStyle}
          className="md-fab-primary"
          onClick={() => setExpanded(!expanded)}
          title={label}
          aria-expanded={expanded}
          aria-haspopup="menu"
        >
          {icon}
        </button>
      </div>
    </div>
  );
};

export default MD3FABMenu;
