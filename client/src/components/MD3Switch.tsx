/**
 * Material Design 3 Switch
 * Toggle switch with Material Design 3 styling
 * Ready to integrate 21st.dev MD3E Switch components
 * 
 * Usage:
 * import { MD3Switch } from './MD3Switch';
 * 
 * <MD3Switch checked={value} onChange={setValue} label="Dark Mode" />
 * <MD3Switch checked={privacyEnabled} onChange={setPrivacy} />
 */

import React from 'react';

interface MD3SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  size?: 'small' | 'medium' | 'large';
}

export const MD3Switch = React.forwardRef<HTMLInputElement, MD3SwitchProps>(
  ({ checked = false, onChange, label, description, size = 'medium', disabled, className = '', ...props }, ref) => {
    const sizeClasses = {
      small: { track: 'w-9 h-5', thumb: 'w-4 h-4', translate: 'translate-x-4' },
      medium: { track: 'w-12 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5.5' },
      large: { track: 'w-14 h-8', thumb: 'w-6 h-6', translate: 'translate-x-7' },
    };

    const sizes = sizeClasses[size];

    return (
      <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            className="sr-only"
            {...props}
          />

          {/* Track */}
          <div
            className={`
              ${sizes.track} rounded-full transition-colors duration-200
              ${
                checked
                  ? 'bg-emerald-500 shadow-md'
                  : 'bg-slate-600 shadow-sm'
              }
            `}
          />

          {/* Thumb (dot) */}
          <div
            className={`
              absolute top-0.5 left-0.5 
              ${sizes.thumb} rounded-full
              bg-white shadow-lg
              transition-transform duration-200
              ${checked ? sizes.translate : 'translate-x-0'}
            `}
          />
        </div>

        {/* Label */}
        {label && (
          <div className="flex-1">
            <div className="font-medium text-sm text-slate-100">{label}</div>
            {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
          </div>
        )}
      </label>
    );
  }
);

MD3Switch.displayName = 'MD3Switch';

export default MD3Switch;
