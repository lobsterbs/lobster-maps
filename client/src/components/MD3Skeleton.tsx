/**
 * Material 3 Expressive Skeleton
 * Loading placeholder with pulse animation
 * https://m3.material.io/components/progress-indicators/specs
 *
 * Features:
 * - Shimmer/pulse animation
 * - Respects prefers-reduced-motion
 * - Full-screen or inline variants
 * - Custom shapes
 */

import React, { CSSProperties } from 'react';

export interface MD3SkeletonProps {
  variant?: 'rectangular' | 'circular' | 'text'; // Default: rectangular
  width?: string | number;
  height?: string | number;
  fullScreen?: boolean; // Cover entire viewport
  speed?: 'slow' | 'normal' | 'fast'; // Default: normal
  className?: string;
  style?: CSSProperties;
}

/**
 * M3 Skeleton Loader
 * Placeholder with pulse/shimmer animation while content loads
 */
export const MD3Skeleton: React.FC<MD3SkeletonProps> = ({
  variant = 'rectangular',
  width = '100%',
  height = '200px',
  fullScreen = false,
  speed = 'normal',
  className,
  style,
}) => {
  const speedDuration = {
    slow: '2s',
    normal: '1.5s',
    fast: '1s',
  }[speed];

  const baseStyle: CSSProperties = {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    animation: `md-skeleton-pulse ${speedDuration} ease-in-out infinite`,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (fullScreen) {
    return (
      <style>{`
        @keyframes md-skeleton-pulse {
          0% {
            opacity: 1;
            background-color: var(--md-sys-color-surface-container);
          }
          50% {
            opacity: 0.6;
            background-color: var(--md-sys-color-surface-container-high);
          }
          100% {
            opacity: 1;
            background-color: var(--md-sys-color-surface-container);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-skeleton] {
            animation: none !important;
            opacity: 0.38 !important;
          }
        }
      `}</style>
    );
  }

  const shapeStyle: CSSProperties = {
    ...baseStyle,
    borderRadius:
      variant === 'circular'
        ? '50%'
        : variant === 'text'
          ? 'var(--md-sys-shape-corner-small)'
          : 'var(--md-sys-shape-corner-medium)',
    ...style,
  };

  return (
    <div
      style={shapeStyle}
      className={`md-skeleton ${className || ''}`}
      data-skeleton
      data-variant={variant}
      aria-hidden="true"
    />
  );
};

/**
 * Full-screen skeleton for map background
 * Covers entire viewport while tiles load
 */
export const MD3MapSkeleton: React.FC<{ visible?: boolean }> = ({ visible = true }) => {
  const containerStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--md-sys-color-surface-container)',
    animation: `md-skeleton-pulse 1.5s ease-in-out infinite`,
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? 'none' : 'auto',
    transition: 'opacity 200ms',
    zIndex: -1,
  };

  return (
    <>
      <style>{`
        @keyframes md-skeleton-pulse {
          0% { opacity: 1; background-color: var(--md-sys-color-surface-container); }
          50% { opacity: 0.7; background-color: var(--md-sys-color-surface-container-high); }
          100% { opacity: 1; background-color: var(--md-sys-color-surface-container); }
        }
        @media (prefers-reduced-motion: reduce) {
          .md-map-skeleton { animation: none !important; opacity: 0.38 !important; }
        }
      `}</style>
      <div
        style={containerStyle}
        className="md-map-skeleton"
        aria-hidden="true"
      />
    </>
  );
};

export default MD3Skeleton;
