/**
 * Material Design 3 Location Card
 * Displays a saved location with coordinates, metadata, and actions
 */

import React, { CSSProperties } from 'react';
import { Globe, Trash2, Copy, AlertCircle } from 'lucide-react';

interface LocationCardProps {
  location: {
    id: string;
    name: string;
    address?: string;
    lat: number;
    lng: number;
    note?: string;
    lastUsed?: Date;
  };
  onDelete?: (id: string) => void;
  onSelect?: (location: LocationCardProps['location']) => void;
}

export const MD3LocationCard: React.FC<LocationCardProps> = ({ location, onDelete, onSelect }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cardStyle: CSSProperties = {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    border: `1px solid var(--md-sys-color-outline-variant)`,
    borderRadius: '12px',
    padding: '12px',
    cursor: onSelect ? 'pointer' : 'default',
    transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '12px',
    gap: '8px',
  };

  const contentStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    flex: 1,
  };

  const iconStyle: CSSProperties = {
    color: 'var(--md-sys-color-on-surface-variant)',
    flexShrink: 0,
    marginTop: '2px',
  };

  const nameStyle: CSSProperties = {
    fontWeight: 600,
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
  };

  const addressStyle: CSSProperties = {
    fontSize: '13px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '4px 0 0 0',
  };

  const recentStyle: CSSProperties = {
    fontSize: '11px',
    color: 'var(--md-sys-color-primary)',
    marginTop: '4px',
    fontWeight: 500,
  };

  const deleteButtonStyle: CSSProperties = {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--md-sys-color-on-surface-variant)',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
  };

  const metadataStyle: CSSProperties = {
    paddingTop: '12px',
    borderTop: `1px solid var(--md-sys-color-outline-variant)`,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const metaItemStyle: CSSProperties = {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const noteStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
  };

  const noteTextStyle: CSSProperties = {
    color: 'var(--md-sys-color-on-surface)',
    fontSize: '12px',
  };

  const actionButtonStyle: CSSProperties = {
    width: '100%',
    marginTop: '12px',
    paddingTop: '8px',
    paddingBottom: '8px',
    backgroundColor: 'transparent',
    border: `1px solid var(--md-sys-color-primary)`,
    color: 'var(--md-sys-color-primary)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all var(--app-duration-short2) var(--app-ease-standard)',
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => onSelect && (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)')}
      onClick={() => onSelect?.(location)}
    >
      <div style={headerStyle}>
        <div style={contentStyle}>
          <Globe size={18} style={iconStyle} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={nameStyle}>{location.name}</h3>
            {location.address && <p style={addressStyle}>{location.address}</p>}
            {location.lastUsed && <div style={recentStyle}>Recently used</div>}
          </div>
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(location.id);
            }}
            style={deleteButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(from var(--md-sys-color-error) r g b / var(--md-sys-state-hover-opacity))';
              e.currentTarget.style.color = 'var(--md-sys-color-error)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--md-sys-color-on-surface-variant)';
            }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div style={metadataStyle}>
        <div
          style={metaItemStyle}
          onMouseEnter={(e) => (e.currentTarget.style.cursor = 'pointer')}
          onClick={handleCopyCoords}
        >
          <span>Coordinates: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
          <Copy size={12} />
        </div>

        {location.note && (
          <div style={noteStyle}>
            <AlertCircle size={12} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--md-sys-color-on-surface-variant)' }} />
            <span style={noteTextStyle}>{location.note}</span>
          </div>
        )}
      </div>

      {onSelect && (
        <button style={actionButtonStyle}>
          Use This Location
        </button>
      )}
    </div>
  );
};

export default MD3LocationCard;
