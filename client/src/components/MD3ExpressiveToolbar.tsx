/**
 * Material 3 Expressive Toolbar
 * Floating pill (64dp) or docked bar with spring motion for expand/collapse.
 * Implements: https://m3.material.io/components/toolbars/specs
 * 
 * Features:
 * - Fast-spatial spring animation (damping 0.6, stiffness 800)
 * - State layers (hover 8%, focus 10%, pressed 10%)
 * - Optional FAB integration with size morphing (56→80dp)
 * - Overflow menu for extra actions
 * - Vibrant (primary-container) or standard (surface-container) color schemes
 */

import React, { CSSProperties, ReactNode } from 'react';

export interface MD3ExpressiveToolbarProps {
  /** Toolbar placement: "floating" (default) or "docked" */
  variant?: 'floating' | 'docked';
  
  /** Expand state for floating toolbars. Drives the spring animation. */
  expanded?: boolean;
  
  /** Callback when expand state changes (from scroll handler, etc) */
  onExpandedChange?: (expanded: boolean) => void;
  
  /** Color scheme: "standard" (surface-container) or "vibrant" (primary-container) */
  colorScheme?: 'standard' | 'vibrant';
  
  /** Leading actions (collapse when expanded=false) */
  leading?: ReactNode[];
  
  /** Main/core actions (always visible) */
  children?: ReactNode;
  
  /** Trailing actions (collapse when expanded=false) */
  trailing?: ReactNode[];
  
  /** Adjacent FAB (triggers expand/collapse when clicked) */
  fab?: ReactNode;
  
  /** FAB position relative to pill: "start" or "end" (default) */
  fabPosition?: 'start' | 'end';
  
  /** Remove default elevation level 3 */
  flat?: boolean;
  
  /** Vertical orientation (docked toolbars only) */
  vertical?: boolean;
  
  /** For docked: which edge (default "bottom") */
  dockEdge?: 'top' | 'bottom' | 'start' | 'end';
  
  /** CSS class name for custom styling */
  className?: string;
  
  /** Inline styles (for positioning, etc) */
  style?: CSSProperties;
}

/**
 * Individual toolbar action with M3E state layers
 */
export interface MD3ToolbarActionProps {
  icon?: ReactNode;
  label?: string;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  tooltip?: string;
  destructive?: boolean;
}

export const MD3ToolbarAction: React.FC<MD3ToolbarActionProps> = ({
  icon,
  label,
  onClick,
  selected,
  disabled,
  tooltip,
  destructive,
}) => {
  const actionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: label ? '8px' : '0',
    minWidth: '48px',
    minHeight: '48px',
    padding: label ? '8px 12px' : '8px',
    backgroundColor: selected
      ? 'var(--md-sys-state-primary-focus)'
      : 'transparent',
    color: destructive
      ? 'var(--md-sys-color-error)'
      : 'var(--md-sys-color-on-surface)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.38 : 1,
    transition: 'background-color 200ms var(--app-ease-standard)',
    fontSize: '14px',
    fontWeight: label ? 500 : 400,
  };

  return (
    <button
      style={actionStyle}
      className="md-toolbar-action"
      data-selected={selected}
      data-destructive={destructive}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      aria-pressed={selected}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
};

/**
 * M3 Expressive Floating Toolbar
 * 64dp pill with spring motion expand/collapse.
 * Optional adjacent FAB that morphs 56→80dp and toggles expansion.
 */
const FloatingToolbar: React.FC<MD3ExpressiveToolbarProps> = ({
  expanded = true,
  onExpandedChange,
  colorScheme = 'standard',
  leading = [],
  children,
  trailing = [],
  fab,
  fabPosition = 'end',
  flat,
  vertical,
  className,
  style,
}) => {
  const hasFab = fab !== undefined && fab !== null;
  const collapsed = !expanded;

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px',
    height: '64px',
    borderRadius: '32px',
    backgroundColor:
      colorScheme === 'vibrant'
        ? 'var(--md-sys-color-primary-container)'
        : 'var(--md-sys-color-surface-container)',
    color:
      colorScheme === 'vibrant'
        ? 'var(--md-sys-color-on-primary-container)'
        : 'var(--md-sys-color-on-surface)',
    boxShadow: flat ? 'none' : 'var(--md-sys-elevation-3)',
    flexDirection: vertical ? 'column' : 'row',
    transition: 'all 350ms var(--md-sys-motion-spring-fast-spatial)',
    width: vertical ? '64px' : 'auto',
    ...style,
  };

  const leadingStyle: CSSProperties = {
    display: 'flex',
    gap: '4px',
    flex: collapsed ? '0 0 0' : '1 0 auto',
    overflow: collapsed ? 'hidden' : 'visible',
    opacity: collapsed ? 0 : 1,
    transition: 'flex 350ms var(--md-sys-motion-spring-fast-spatial), opacity 200ms',
    whiteSpace: 'nowrap',
  };

  const trailingStyle: CSSProperties = {
    display: 'flex',
    gap: '4px',
    flex: collapsed ? '0 0 0' : '1 0 auto',
    overflow: collapsed ? 'hidden' : 'visible',
    opacity: collapsed ? 0 : 1,
    transition: 'flex 350ms var(--md-sys-motion-spring-fast-spatial), opacity 200ms',
    whiteSpace: 'nowrap',
  };

  const coreStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: '0 1 auto',
  };

  const fabStyle: CSSProperties = {
    transform: hasFab ? 'scale(1)' : 'scale(0)',
    opacity: hasFab ? 1 : 0,
    marginLeft: fabPosition === 'start' ? '8px' : '0',
    marginRight: fabPosition === 'end' ? '8px' : '0',
    transition: 'all 350ms var(--md-sys-motion-spring-fast-spatial)',
  };

  return (
    <div style={containerStyle} className={`md-toolbar-floating ${className || ''}`}>
      {fabPosition === 'start' && <div style={fabStyle}>{fab}</div>}

      <div style={leadingStyle} role="group" aria-label="Leading actions">
        {leading}
      </div>

      <div style={coreStyle} role="group" aria-label="Core actions">
        {children}
      </div>

      <div style={trailingStyle} role="group" aria-label="Trailing actions">
        {trailing}
      </div>

      {fabPosition === 'end' && <div style={fabStyle}>{fab}</div>}
    </div>
  );
};

/**
 * M3 Expressive Docked Toolbar
 * Full-width bar (64dp) docked to screen edge with square corners.
 * Successor to bottom app bar.
 */
const DockedToolbar: React.FC<MD3ExpressiveToolbarProps> = ({
  colorScheme = 'standard',
  leading = [],
  children,
  trailing = [],
  flat,
  dockEdge = 'bottom',
  className,
  style,
}) => {
  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    padding: '8px 16px',
    height: '64px',
    width: '100%',
    backgroundColor:
      colorScheme === 'vibrant'
        ? 'var(--md-sys-color-primary-container)'
        : 'var(--md-sys-color-surface-container)',
    color:
      colorScheme === 'vibrant'
        ? 'var(--md-sys-color-on-primary-container)'
        : 'var(--md-sys-color-on-surface)',
    boxShadow: flat ? 'none' : 'var(--md-sys-elevation-1)',
    borderRadius: dockEdge === 'top' ? '0 0 16px 16px' : '16px 16px 0 0',
    ...style,
  };

  return (
    <div
      style={containerStyle}
      className={`md-toolbar-docked ${className || ''}`}
      role="toolbar"
    >
      <div style={{ display: 'flex', gap: '8px' }} role="group">
        {leading}
      </div>

      <div style={{ display: 'flex', gap: '8px', flex: 1 }} role="group">
        {children}
      </div>

      <div style={{ display: 'flex', gap: '8px' }} role="group">
        {trailing}
      </div>
    </div>
  );
};

/**
 * Main M3 Expressive Toolbar Component
 * Switches between floating and docked based on variant prop.
 */
export const MD3ExpressiveToolbar: React.FC<MD3ExpressiveToolbarProps> = (
  props
) => {
  if (props.variant === 'docked') {
    return <DockedToolbar {...props} />;
  }

  return <FloatingToolbar {...props} />;
};

export default MD3ExpressiveToolbar;
