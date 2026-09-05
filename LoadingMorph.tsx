import { M3LoadingIndicator } from '@alerix/m3-loading-indicator/react';

// Real Material 3 Expressive shape-morph indicator, ported from Android's
// actual material-components-android source (Apache 2.0) — genuine Google
// shape data and spring physics, not an approximation.
//
// Color is a literal hex, not var(--lobster-red): this renders to a
// <canvas>, and canvas fillStyle doesn't resolve CSS custom properties
// the way DOM styles do, so a var() string here would silently fail to
// paint anything. Keep this in sync with --lobster-red in tokens.css.
const LOBSTER_RED = '#E83F3F';

export function LoadingMorph({ size = 48 }: { size?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <M3LoadingIndicator size={size} color={LOBSTER_RED} />
    </div>
  );
}
