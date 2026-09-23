/**
 * LobsterMaps Watermark
 * Semi-transparent branded overlay for maps
 * Removes OpenStreetMap and other attribution overlays
 */

import React from 'react';

export interface MapWatermarkProps {
  version?: string; // e.g., "Argon", "Chinchilla"
}

export const MapWatermark: React.FC<MapWatermarkProps> = ({ version }) => {
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    pointerEvents: 'none',
    zIndex: 500,
  };

  const watermarkStyle: React.CSSProperties = {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    color: 'rgba(255, 255, 255, 0.7)',
    padding: '8px 12px',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const lobsterLogoStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
  };

  return (
    <div style={containerStyle} className="map-watermark" aria-hidden="true">
      <div style={watermarkStyle}>
        <span style={lobsterLogoStyle}>🦞</span>
        <span>
          LobsterMaps
          {version && ` · ${version}`}
        </span>
      </div>
    </div>
  );
};

export default MapWatermark;
