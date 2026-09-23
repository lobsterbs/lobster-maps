/**
 * Material 3 Expressive Card
 * Container with elevation, shadow, and optional image
 * https://m3.material.io/components/cards/specs
 *
 * Features:
 * - Elevation level 1 (default) to 3 (elevated)
 * - Optional header image
 * - Title and supporting text
 * - Action buttons
 * - State layers on hover/click
 * - Touch-friendly (48dp minimum targets)
 */

import React, { CSSProperties, ReactNode } from 'react';

export interface MD3CardProps {
  image?: ReactNode; // Header image or media
  imageHeight?: string | number;
  title?: string;
  subtitle?: string;
  children?: ReactNode; // Card content
  actions?: ReactNode; // Action buttons (typically Button Group)
  outlined?: boolean; // Use outline style instead of filled
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * M3 Card
 * Content container with elevation and optional header image
 */
export const MD3Card: React.FC<MD3CardProps> = ({
  image,
  imageHeight = '200px',
  title,
  subtitle,
  children,
  actions,
  outlined = false,
  disabled = false,
  onClick,
  className,
  style,
}) => {
  const containerStyle: CSSProperties = {
    borderRadius: 'var(--md-sys-shape-corner-large)',
    backgroundColor: outlined
      ? 'transparent'
      : 'var(--md-sys-color-surface-container)',
    border: outlined ? '1px solid var(--md-sys-color-outline)' : 'none',
    boxShadow: outlined ? 'none' : 'var(--md-sys-elevation-1)',
    overflow: 'hidden',
    cursor: onClick && !disabled ? 'pointer' : 'default',
    opacity: disabled ? 0.38 : 1,
    transition: 'all 200ms var(--md-sys-motion-spring-standard-spatial)',
    ...style,
  };

  const imageStyle: CSSProperties = {
    width: '100%',
    height: typeof imageHeight === 'number' ? `${imageHeight}px` : imageHeight,
    objectFit: 'cover',
    display: 'block',
  };

  const contentStyle: CSSProperties = {
    padding: '16px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--md-sys-color-on-surface)',
    margin: '0 0 4px 0',
    lineHeight: 1.3,
  };

  const subtitleStyle: CSSProperties = {
    fontSize: '14px',
    fontWeight: 400,
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '0 0 12px 0',
    lineHeight: 1.4,
  };

  const bodyStyle: CSSProperties = {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface)',
    lineHeight: 1.5,
    marginBottom: actions ? '12px' : '0',
  };

  const actionsStyle: CSSProperties = {
    borderTop: '1px solid var(--md-sys-color-outline-variant)',
    padding: '12px 16px',
  };

  return (
    <article
      style={containerStyle}
      className={`md-card ${className || ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Header image */}
      {image && (
        <div style={{ overflow: 'hidden' }}>
          {typeof image === 'string' ? (
            <img src={image} alt="" style={imageStyle} />
          ) : (
            <div style={imageStyle}>{image}</div>
          )}
        </div>
      )}

      {/* Title and subtitle */}
      {(title || subtitle) && (
        <div style={contentStyle}>
          {title && <h2 style={titleStyle}>{title}</h2>}
          {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
        </div>
      )}

      {/* Card content */}
      {children && (
        <div style={{ ...contentStyle, paddingTop: title || subtitle ? '0' : '16px' }}>
          <div style={bodyStyle}>{children}</div>
        </div>
      )}

      {/* Action buttons */}
      {actions && <div style={actionsStyle}>{actions}</div>}
    </article>
  );
};

export default MD3Card;
