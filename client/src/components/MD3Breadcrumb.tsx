/**
 * Material 3 Expressive Breadcrumb
 * Navigation hierarchy showing current location path
 * https://m3.material.io/components/navigation-drawer/specs (adapted)
 *
 * Features:
 * - Hierarchical path display (Home > Category > Item)
 * - Clickable items for navigation
 * - Icon support
 * - Responsive (truncates on mobile)
 * - State layers on hover
 */

import React, { CSSProperties, ReactNode } from 'react';

export interface BreadcrumbItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
}

export interface MD3BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode; // Default: '/'
  className?: string;
  style?: CSSProperties;
}

/**
 * Single breadcrumb item
 */
const BreadcrumbSegment: React.FC<{
  item: BreadcrumbItem;
  isLast?: boolean;
  separator?: ReactNode;
}> = ({ item, isLast, separator = '/' }) => {
  const itemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: item.onClick ? 'pointer' : 'default',
    color: 'var(--md-sys-color-on-surface)',
    fontSize: '14px',
    padding: '8px 0',
  };

  const linkStyle: CSSProperties = {
    color: item.onClick
      ? 'var(--md-sys-color-primary)'
      : 'var(--md-sys-color-on-surface-variant)',
    textDecoration: item.onClick ? 'none' : 'none',
    cursor: item.onClick ? 'pointer' : 'default',
    transition: 'color 200ms var(--md-sys-motion-spring-standard-spatial)',
    fontWeight: item.onClick ? 500 : 400,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const separatorStyle: CSSProperties = {
    margin: '0 8px',
    color: 'var(--md-sys-color-on-surface-variant)',
    opacity: 0.6,
  };

  return (
    <div style={itemStyle} key={item.id}>
      <button
        style={linkStyle}
        onClick={item.onClick}
        disabled={!item.onClick}
        title={item.label}
      >
        {item.icon && <span>{item.icon}</span>}
        <span>{item.label}</span>
      </button>
      {!isLast && <span style={separatorStyle}>{separator}</span>}
    </div>
  );
};

/**
 * M3 Breadcrumb
 * Hierarchical navigation path for current location
 */
export const MD3Breadcrumb: React.FC<MD3BreadcrumbProps> = ({
  items,
  separator = '/',
  className,
  style,
}) => {
  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    padding: '8px 16px',
    backgroundColor: 'var(--md-sys-color-surface)',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    scrollBehavior: 'smooth',
    ...style,
  };

  return (
    <nav
      style={containerStyle}
      className={`md-breadcrumb ${className || ''}`}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <BreadcrumbSegment
          key={item.id}
          item={item}
          isLast={index === items.length - 1}
          separator={separator}
        />
      ))}
    </nav>
  );
};

export default MD3Breadcrumb;
