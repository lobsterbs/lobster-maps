/**
 * Material 3 Expressive Navigation Rail
 * Vertical navigation sidebar with icons, labels, and optional FAB
 * https://m3.material.io/components/navigation-rail/specs
 *
 * Features:
 * - Icon + label layout
 * - Optional FAB at top or bottom
 * - Badge support for notifications
 * - Scrollable content area
 * - State layers (hover 8%, focus 10%, selected)
 * - 80dp width (expanded: 256dp)
 */

import React, { CSSProperties, ReactNode } from 'react';

export interface MD3NavRailItem {
  id: string;
  icon: ReactNode;
  label: string;
  badge?: number | boolean; // true shows dot, number shows count
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export interface MD3NavRailProps {
  items: MD3NavRailItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  fab?: ReactNode; // Floating action button at top
  fabPosition?: 'top' | 'bottom'; // Default: top
  children?: ReactNode; // Content area between items and FAB
  className?: string;
  style?: CSSProperties;
}

/**
 * Single navigation rail item (icon + label + badge)
 */
const NavRailItem: React.FC<MD3NavRailItem & { selected?: boolean; onSelect?: () => void }> = ({
  icon,
  label,
  badge,
  onClick,
  selected,
  disabled,
  onSelect,
}) => {
  const itemStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    minWidth: '80px',
    padding: '12px 8px',
    backgroundColor: selected
      ? 'var(--md-sys-state-primary-focus)'
      : 'transparent',
    color: disabled
      ? 'var(--md-sys-color-on-surface)'
      : selected
        ? 'var(--md-sys-color-primary)'
        : 'var(--md-sys-color-on-surface)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.38 : 1,
    transition: 'background-color 200ms var(--md-sys-motion-spring-standard-spatial)',
    fontSize: '12px',
    fontWeight: 500,
    textAlign: 'center',
    lineHeight: 1.2,
    position: 'relative',
  };

  return (
    <button
      style={itemStyle}
      className="md-nav-rail-item"
      data-selected={selected}
      onClick={() => {
        onClick?.();
        onSelect?.();
      }}
      disabled={disabled}
      title={label}
      aria-pressed={selected}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon}
        {badge && (
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '20px',
              height: '20px',
              borderRadius: '10px',
              backgroundColor: 'var(--md-sys-color-error)',
              color: 'var(--md-sys-color-on-error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              padding: badge === true ? '0' : '0 6px',
            }}
          >
            {badge === true ? '' : badge}
          </div>
        )}
      </div>
      <span>{label}</span>
    </button>
  );
};

/**
 * M3 Navigation Rail
 * Vertical sidebar with scrollable navigation items and optional FAB
 */
export const MD3NavRail: React.FC<MD3NavRailProps> = ({
  items,
  selectedId,
  onSelect,
  fab,
  fabPosition = 'top',
  children,
  className,
  style,
}) => {
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '80px',
    height: '100vh',
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRight: '1px solid var(--md-sys-color-outline-variant)',
    boxShadow: 'var(--md-sys-elevation-1)',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 1000,
    ...style,
  };

  const fabWrapperStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '12px 8px',
    minHeight: 'auto',
  };

  const scrollAreaStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  };

  return (
    <nav style={containerStyle} className={`md-nav-rail ${className || ''}`}>
      {/* FAB at top */}
      {fab && fabPosition === 'top' && <div style={fabWrapperStyle}>{fab}</div>}

      {/* Scrollable items */}
      <div style={scrollAreaStyle} role="group" aria-label="Navigation">
        {items.map((item) => (
          <NavRailItem
            key={item.id}
            {...item}
            selected={selectedId === item.id}
            onSelect={() => onSelect?.(item.id)}
          />
        ))}
      </div>

      {/* Custom content area (e.g., divider, settings icon) */}
      {children && <div style={{ padding: '12px 8px' }}>{children}</div>}

      {/* FAB at bottom */}
      {fab && fabPosition === 'bottom' && <div style={fabWrapperStyle}>{fab}</div>}
    </nav>
  );
};

export default MD3NavRail;
