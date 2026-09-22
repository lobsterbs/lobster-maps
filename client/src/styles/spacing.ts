/**
 * M3 Responsive Spacing System
 *
 * These utilities reference CSS variables that change at breakpoints:
 * - Compact: < 480px (phone portrait)
 * - Medium: 480–839px (tablet portrait, phone landscape)
 * - Expanded: >= 840px (tablet landscape, desktop)
 *
 * Usage: Apply these to inline styles or CSS modules that need responsive spacing
 * Example: style={{ padding: SPACING.md }}
 */

export const SPACING = {
  // Compact micro-spacing
  compact: 'var(--md-sys-spacing-compact)',
  
  // Extra small (8–12px depending on density)
  xs: 'var(--md-sys-spacing-xs)',
  
  // Small (12–16px)
  sm: 'var(--md-sys-spacing-sm)',
  
  // Medium (16–20px, default for most components)
  md: 'var(--md-sys-spacing-md)',
  
  // Large (20–28px, for section separation)
  lg: 'var(--md-sys-spacing-lg)',
  
  // Extra large (24–32px, for major layout gaps)
  xl: 'var(--md-sys-spacing-xl)',
} as const;

export const COMPONENT_PADDING = {
  // Compact density (smaller touch targets)
  compact: 'var(--md-sys-component-padding-compact)',
  
  // Normal density (standard M3)
  normal: 'var(--md-sys-component-padding-normal)',
} as const;

export const ICON_SIZE = {
  small: 'var(--md-sys-icon-size-small)',
  normal: 'var(--md-sys-icon-size-normal)',
  large: 'var(--md-sys-icon-size-large)',
} as const;

/**
 * Responsive grid layout columns per breakpoint
 * Compact (< 480px): 4 columns
 * Medium (480–839px): 8 columns
 * Expanded (>= 840px): 12 columns
 */
export const GRID_COLUMNS = 'var(--md-sys-layout-columns)';

/**
 * Common responsive padding values for cards and containers
 */
export const CARD_PADDING = {
  // Standard card padding (16px medium, 12px compact, 20px expanded)
  standard: SPACING.md,
  
  // Tight card padding (8px compact, 12px medium, 16px expanded)
  tight: SPACING.sm,
  
  // Loose card padding (20px medium, 16px compact, 24px expanded)
  loose: SPACING.lg,
} as const;

/**
 * Responsive gap values for flex/grid layouts
 */
export const GAP = {
  compact: SPACING.compact,
  xs: SPACING.xs,
  sm: SPACING.sm,
  md: SPACING.md,
  lg: SPACING.lg,
  xl: SPACING.xl,
} as const;
