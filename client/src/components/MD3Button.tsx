/**
 * Material Design 3 Button
 * Variants: Filled | Tonal | Outlined | Text
 * Ready to integrate 21st.dev MD3E Button components
 * 
 * Usage:
 * import { MD3Button } from './MD3Button';
 * 
 * <MD3Button variant="filled">Navigate</MD3Button>
 * <MD3Button variant="outlined" size="small">Cancel</MD3Button>
 * <MD3Button variant="tonal" icon={<MapPin size={16} />}>Save</MD3Button>
 */

import React, { CSSProperties } from 'react';

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';
type ButtonSize = 'small' | 'medium' | 'large';

interface MD3ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  filled: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    boxShadow: 'var(--md-sys-elevation-shadow-1)',
  },
  tonal: {
    backgroundColor: 'var(--md-sys-color-secondary-container)',
    color: 'var(--md-sys-color-on-secondary-container)',
    border: 'none',
  },
  outlined: {
    backgroundColor: 'transparent',
    color: 'var(--md-sys-color-primary)',
    border: `2px solid var(--md-sys-color-outline)`,
  },
  text: {
    backgroundColor: 'transparent',
    color: 'var(--md-sys-color-primary)',
    border: 'none',
  },
};

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  small: { padding: '8px 12px', fontSize: '12px', minHeight: '48px', minWidth: '48px' },
  medium: { padding: '12px 16px', fontSize: '14px', minHeight: '48px', minWidth: '48px' },
  large: { padding: '16px 24px', fontSize: '16px', minHeight: '48px', minWidth: '48px' },
};

export const MD3Button = React.forwardRef<HTMLButtonElement, MD3ButtonProps>(
  (
    {
      variant = 'filled',
      size = 'medium',
      icon,
      children,
      fullWidth = false,
      loading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isActive, setIsActive] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    // Compute state-layer overlay based on M3 spec
    const getStateLayerColor = () => {
      if (isActive) return `rgba(from var(--md-sys-color-primary) r g b / var(--md-sys-state-pressed-opacity))`;
      if (isHovered) return `rgba(from var(--md-sys-color-primary) r g b / var(--md-sys-state-hover-opacity))`;
      return 'transparent';
    };

    const buttonStyle: CSSProperties = {
      ...variantStyle,
      ...sizeStyle,
      fontWeight: 500,
      transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.5 : 1,
      border: variantStyle.border || 'none',
      borderRadius: '8px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      whiteSpace: 'nowrap',
      outline: isFocused ? `3px solid var(--md-sys-color-primary)` : 'none',
      outlineOffset: isFocused ? '2px' : '0px',
      ...(fullWidth && { width: '100%' }),
      // State layer overlay
      boxShadow: `inset 0 0 0 9999px ${getStateLayerColor()}`,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={buttonStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
        onMouseDown={() => setIsActive(true)}
        onMouseUp={() => setIsActive(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      >
        {loading ? (
          <>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            {children}
          </>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
    );
  }
);

MD3Button.displayName = 'MD3Button';

export default MD3Button;
