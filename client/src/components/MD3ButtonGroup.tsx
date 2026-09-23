/**
 * Material 3 Expressive Button Group
 * Connected buttons for related actions
 * https://m3.material.io/components/button-groups/specs
 *
 * Features:
 * - Icon + label variants
 * - Tonal or outlined style
 * - Connected layout (no gaps)
 * - State layers (hover, focus, pressed)
 * - Touch targets (48dp minimum)
 */

import React, { CSSProperties, ReactNode } from 'react';

export interface ButtonGroupAction {
  id: string;
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface MD3ButtonGroupProps {
  actions: ButtonGroupAction[];
  onAction?: (id: string) => void;
  variant?: 'tonal' | 'outlined'; // Default: tonal
  vertical?: boolean; // Vertical layout (default: horizontal)
  className?: string;
  style?: CSSProperties;
}

/**
 * Single button group action
 */
const ButtonGroupItem: React.FC<{
  action: ButtonGroupAction;
  first?: boolean;
  last?: boolean;
  vertical?: boolean;
  onClick?: () => void;
  variant?: 'tonal' | 'outlined';
}> = ({ action, first, last, vertical, onClick, variant = 'tonal' }) => {
  const buttonStyle: CSSProperties = {
    flex: 1,
    minWidth: '48px',
    minHeight: '48px',
    padding: '8px 12px',
    backgroundColor:
      variant === 'tonal'
        ? 'var(--md-sys-color-secondary-container)'
        : 'transparent',
    color: action.destructive
      ? 'var(--md-sys-color-error)'
      : 'var(--md-sys-color-on-secondary-container)',
    border: variant === 'outlined' ? '1px solid var(--md-sys-color-outline)' : 'none',
    borderLeft:
      !vertical && first
        ? '1px solid var(--md-sys-color-outline)'
        : variant === 'outlined'
          ? 'none'
          : 'none',
    borderRight:
      !vertical && last
        ? '1px solid var(--md-sys-color-outline)'
        : variant === 'outlined'
          ? 'none'
          : 'none',
    borderTop:
      vertical && first
        ? '1px solid var(--md-sys-color-outline)'
        : variant === 'outlined'
          ? 'none'
          : 'none',
    borderBottom:
      vertical && last
        ? '1px solid var(--md-sys-color-outline)'
        : variant === 'outlined'
          ? 'none'
          : 'none',
    borderRadius: vertical
      ? first
        ? 'var(--md-sys-shape-corner-medium) var(--md-sys-shape-corner-medium) 0 0'
        : last
          ? '0 0 var(--md-sys-shape-corner-medium) var(--md-sys-shape-corner-medium)'
          : '0'
      : first
        ? 'var(--md-sys-shape-corner-medium) 0 0 var(--md-sys-shape-corner-medium)'
        : last
          ? '0 var(--md-sys-shape-corner-medium) var(--md-sys-shape-corner-medium) 0'
          : '0',
    cursor: action.disabled ? 'not-allowed' : 'pointer',
    opacity: action.disabled ? 0.38 : 1,
    transition: 'all 200ms var(--md-sys-motion-spring-standard-spatial)',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    outline: 'none',
  };

  return (
    <button
      style={buttonStyle}
      className="md-button-group-item"
      data-destructive={action.destructive}
      onClick={onClick}
      disabled={action.disabled}
      title={action.label}
    >
      {action.icon && <span>{action.icon}</span>}
      <span>{action.label}</span>
    </button>
  );
};

/**
 * M3 Button Group
 * Connected buttons for related actions (transport modes, social sharing, etc.)
 */
export const MD3ButtonGroup: React.FC<MD3ButtonGroupProps> = ({
  actions,
  onAction,
  variant = 'tonal',
  vertical = false,
  className,
  style,
}) => {
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: vertical ? 'column' : 'row',
    gap: '0',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    overflow: 'hidden',
    ...style,
  };

  const handleAction = (id: string) => {
    onAction?.(id);
    const action = actions.find((a) => a.id === id);
    action?.onClick?.();
  };

  return (
    <div
      style={containerStyle}
      className={`md-button-group ${className || ''}`}
      role="group"
      aria-label="Action buttons"
    >
      {actions.map((action, index) => (
        <ButtonGroupItem
          key={action.id}
          action={action}
          first={index === 0}
          last={index === actions.length - 1}
          vertical={vertical}
          variant={variant}
          onClick={() => handleAction(action.id)}
        />
      ))}
    </div>
  );
};

export default MD3ButtonGroup;
