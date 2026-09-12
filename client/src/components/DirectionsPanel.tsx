/**
 * Directions Panel - Google Maps Style
 * Shows route options + transit info
 */

import React, { useState } from 'react';
import { MapPin, Clock, Navigation, Bus, ChevronDown } from 'lucide-react';

interface RouteOption {
  type: 'car' | 'transit';
  distance?: number;
  duration: number;
  steps?: any[];
  legs?: any[];
}

interface DirectionsPanelProps {
  from?: string;
  to?: string;
  routes?: RouteOption[];
  loading?: boolean;
  onSelect?: (route: RouteOption) => void;
}

const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  from,
  to,
  routes = [],
  loading = false,
  onSelect = () => {},
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    return `${hours}h ${remainder}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        top: 16,
        width: '320px',
        maxHeight: '70vh',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        overflowY: 'auto',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'rgba(203, 213, 225, 0.7)', fontSize: '12px' }}>
          <MapPin size={16} />
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{from || 'Current location'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(203, 213, 225, 0.7)', fontSize: '12px' }}>
          <Navigation size={16} />
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{to || 'Destination'}</span>
        </div>
      </div>

      {/* Routes */}
      {loading ? (
        <div style={{ color: 'rgba(203, 213, 225, 0.5)', textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: '12px' }}>Finding routes...</div>
        </div>
      ) : routes.length === 0 ? (
        <div style={{ color: 'rgba(203, 213, 225, 0.5)', textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: '12px' }}>No routes found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {routes.map((route, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedIndex(idx);
                onSelect(route);
              }}
              style={{
                padding: '12px',
                backgroundColor: selectedIndex === idx ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                border: selectedIndex === idx ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.1)',
                borderRadius: '8px',
                color: '#f1f5f9',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 200ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = selectedIndex === idx ? 'rgba(16, 185, 129, 0.15)' : 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                {route.type === 'car' ? (
                  <Navigation size={16} color="#10b981" />
                ) : (
                  <Bus size={16} color="#10b981" />
                )}
                <span style={{ fontWeight: '500', fontSize: '14px' }}>
                  {route.type === 'car' ? 'Driving' : 'Transit'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(203, 213, 225, 0.7)' }}>
                <Clock size={14} />
                <span>{formatTime(route.duration)}</span>
                {route.distance && (
                  <>
                    <span>•</span>
                    <span>{formatDistance(route.distance)}</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DirectionsPanel;
