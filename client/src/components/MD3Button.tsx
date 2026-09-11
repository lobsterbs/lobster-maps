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

import React from 'react';

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

const variantStyles: Record<ButtonVariant, string> = {
  filled: `
    bg-emerald-500 text-white hover:bg-emerald-600 
    active:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400
    shadow-md hover:shadow-lg active:shadow-md
  `,
  tonal: `
    bg-emerald-100 text-emerald-900 hover:bg-emerald-200 
    active:bg-emerald-300 disabled:bg-slate-700 disabled:text-slate-400
    dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/40
  `,
  outlined: `
    border-2 border-slate-500 text-slate-900 hover:bg-slate-100 
    active:bg-slate-200 disabled:border-slate-400 disabled:text-slate-400
    dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-500/10 dark:active:bg-emerald-500/20
  `,
  text: `
    text-emerald-600 hover:bg-emerald-500/10 
    active:bg-emerald-500/20 disabled:text-slate-400
    dark:text-emerald-400 dark:hover:bg-emerald-500/10
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  small: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  medium: 'px-4 py-2.5 text-base rounded-lg gap-2',
  large: 'px-6 py-3 text-lg rounded-xl gap-2.5',
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
    const baseStyles = `
      font-medium transition-all duration-200 
      inline-flex items-center justify-center whitespace-nowrap
      focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2
      focus:ring-offset-slate-900
      disabled:cursor-not-allowed
    `;

    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];
    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyle} ${sizeStyle} ${widthStyle} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
