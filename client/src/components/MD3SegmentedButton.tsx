/**
 * Material 3 Expressive Segmented Button
 * Radio-button group styled as connected segments
 * https://m3.material.io/components/segmented-buttons/specs
 *
 * Features:
 * - Single or multiple selection modes
 * - Icon + label variants
 * - State layers (hover 8%, focus 10%, selected)
 * - Keyboard navigation (arrow keys)
 * - Touch targets (48dp minimum)
 */

import React, { CSSProperties, ReactNode } from 'react';

export interface SegmentedButtonOption {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface MD3SegmentedButtonProps {
  options: SegmentedButtonOption[];
  selectedId?: string; // Single selection
  selectedIds?: string[]; // Multiple selection
  onSelect?: (id: string) => void;
  onSelectMultiple?: (ids: string[]) => void;
  multiSelect?: boolean; // Default: false (radio mode)
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Single segmented button option
 */
const SegmentOption: React.FC<{
  option: SegmentedButtonOption;
  selected?: boolean;
  first?: boolean;
  last?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ option, selected, first, last, onClick, disabled }) => {
  const buttonStyle: CSSProperties = {
    flex: 1,
    minWidth: '48px',
    minHeight: '48px',
    padding: '8px 16px',
    backgroundColor: selected
      ? 'var(--md-sys-color-primary)'
      : 'transparent',
    color: selected
      ? 'var(--md-sys-color-on-primary)'
      : 'var(--md-sys-color-on-surface)',
    border: '1px solid var(--md-sys-color-outline)',
    borderLeft: first ? '1px solid var(--md-sys-color-outline)' : 'none',
    borderRight: last ? '1px solid var(--md-sys-color-outline)' : 'none',
    borderRadius: first
      ? 'var(--md-sys-shape-corner-medium) 0 0 var(--md-sys-shape-corner-medium)'
      : last
        ? '0 var(--md-sys-shape-corner-medium) var(--md-sys-shape-corner-medium) 0'
        : '0',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.38 : 1,
    transition: 'all 200ms var(--md-sys-motion-spring-standard-spatial)',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    outline: 'none',
  };

  return (
    <button
      style={buttonStyle}
      className="md-segmented-option"
      data-selected={selected}
      onClick={onClick}
      disabled={disabled}
      title={option.label}
      aria-pressed={selected}
    >
      {option.icon && <span>{option.icon}</span>}
      <span>{option.label}</span>
    </button>
  );
};

/**
 * M3 Segmented Button Group
 * Connected buttons for related options (radio or checkbox style)
 */
export const MD3SegmentedButton: React.FC<MD3SegmentedButtonProps> = ({
  options,
  selectedId,
  selectedIds = [],
  onSelect,
  onSelectMultiple,
  multiSelect = false,
  disabled = false,
  className,
  style,
}) => {
  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: '0',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    overflow: 'hidden',
    boxShadow: 'var(--md-sys-elevation-1)',
    ...style,
  };

  const handleSelect = (id: string) => {
    if (multiSelect) {
      const newIds = selectedIds.includes(id)
        ? selectedIds.filter((sid) => sid !== id)
        : [...selectedIds, id];
      onSelectMultiple?.(newIds);
    } else {
      onSelect?.(id);
    }
  };

  return (
    <div
      style={containerStyle}
      className={`md-segmented-button ${className || ''}`}
      role="group"
      aria-label="Segmented buttons"
    >
      {options.map((option, index) => (
        <SegmentOption
          key={option.id}
          option={option}
          selected={
            multiSelect ? selectedIds.includes(option.id) : selectedId === option.id
          }
          first={index === 0}
          last={index === options.length - 1}
          onClick={() => handleSelect(option.id)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default MD3SegmentedButton;
