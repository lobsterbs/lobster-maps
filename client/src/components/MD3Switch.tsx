/**
 * Material Design 3 Switch
 * Toggle switch with Material Design 3 styling
 */

import React, { CSSProperties } from 'react';

interface MD3SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  size?: 'small' | 'medium' | 'large';
}

export const MD3Switch = React.forwardRef<HTMLInputElement, MD3SwitchProps>(
  ({ checked = false, onChange, label, description, size = 'medium', disabled, ...props }, ref) => {
    const sizeConfig = {
      small: { trackWidth: 36, trackHeight: 20, thumbSize: 16, translate: 16 },
      medium: { trackWidth: 48, trackHeight: 24, thumbSize: 20, translate: 22 },
      large: { trackWidth: 56, trackHeight: 32, thumbSize: 24, translate: 28 },
    };

    const config = sizeConfig[size];

    const labelStyle: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    };

    const containerStyle: CSSProperties = {
      position: 'relative',
      display: 'inline-block',
    };

    const inputStyle: CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      opacity: 0,
    };

    const trackStyle: CSSProperties = {
      width: config.trackWidth,
      height: config.trackHeight,
      borderRadius: '999px',
      backgroundColor: checked ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-dim)',
      boxShadow: checked ? 'var(--md-sys-elevation-shadow-1)' : 'none',
      transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
    };

    const thumbStyle: CSSProperties = {
      position: 'absolute',
      top: (config.trackHeight - config.thumbSize) / 2,
      left: (config.trackHeight - config.thumbSize) / 2,
      width: config.thumbSize,
      height: config.thumbSize,
      borderRadius: '50%',
      backgroundColor: checked ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-outline)',
      boxShadow: 'var(--md-sys-elevation-shadow-1)',
      transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
      transform: checked ? `translateX(${config.translate}px)` : 'translateX(0px)',
    };

    const labelTextStyle: CSSProperties = {
      fontWeight: 500,
      fontSize: '14px',
      color: 'var(--md-sys-color-on-surface)',
    };

    const descriptionStyle: CSSProperties = {
      fontSize: '12px',
      color: 'var(--md-sys-color-on-surface-variant)',
      marginTop: '2px',
    };

    const labelWrapperStyle: CSSProperties = {
      flex: 1,
    };

    return (
      <label style={labelStyle}>
        <div style={containerStyle}>
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            style={inputStyle}
            {...props}
          />
          <div style={trackStyle} />
          <div style={thumbStyle} />
        </div>

        {label && (
          <div style={labelWrapperStyle}>
            <div style={labelTextStyle}>{label}</div>
            {description && <div style={descriptionStyle}>{description}</div>}
          </div>
        )}
      </label>
    );
  }
);

MD3Switch.displayName = 'MD3Switch';

export default MD3Switch;
