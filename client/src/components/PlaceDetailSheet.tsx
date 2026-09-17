/**
 * Place Detail Sheet - Google Maps Style
 * Shows place info, images, reviews, actions
 */

import React, { useState } from 'react';
import { Phone, Globe, MapPin, Navigation, Star, Clock, X } from 'lucide-react';

interface PlaceDetail {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  phone?: string;
  website?: string;
  category?: string;
  rating?: number;
  reviews?: number;
  images?: string[];
  hours?: string;
  description?: string;
}

interface PlaceDetailSheetProps {
  place?: PlaceDetail | null;
  onClose?: () => void;
  onNavigate?: (lat: number, lon: number, name: string) => void;
}

const PlaceDetailSheet: React.FC<PlaceDetailSheetProps> = ({ place, onClose = () => {}, onNavigate = () => {} }) => {
  const [imageIdx, setImageIdx] = useState(0);

  if (!place) return null;

  const images = (place.images && place.images.length > 0) ? place.images : [
    `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="18">${encodeURIComponent(place.name)}</text></svg>`,
  ];

  return (
    <article
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '70vh',
        backgroundColor: 'var(--md-sys-color-surface-container-high)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid var(--md-sys-color-outline-variant)`,
        borderRadius: '20px 20px 0 0',
        padding: '24px',
        overflowY: 'auto',
        zIndex: 40,
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5)',
        animation: 'slideUp 300ms ease',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'none',
          border: 'none',
          color: 'rgba(203, 213, 225, 0.6)',
          cursor: 'pointer',
        }}
      >
        <X size={24} />
      </button>

      {/* Image carousel */}
      <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden' }}>
        <img
          src={images[imageIdx]}
          alt={place.name}
          style={{ width: '100%', height: '280px', objectFit: 'cover' }}
        />
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)' }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImageIdx(i)}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: i === imageIdx ? 'var(--md-sys-color-primary)' : 'rgba(198, 198, 203, 0.4)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
          <h2 style={{ margin: 0, color: 'var(--md-sys-color-on-surface)', fontSize: '24px', fontWeight: '600' }}>{place.name}</h2>
          {place.rating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--md-sys-color-primary)' }}>
              <Star size={16} fill="var(--md-sys-color-primary)" />
              <span>{place.rating.toFixed(1)}</span>
              {place.reviews && <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '14px' }}>({place.reviews})</span>}
            </div>
          )}
        </div>
        {place.category && (
          <div style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '14px', marginBottom: '8px' }}>
            {place.category}
          </div>
        )}
        {place.description && (
          <div style={{ color: 'rgba(203, 213, 225, 0.7)', fontSize: '14px', lineHeight: '1.5' }}>
            {place.description}
          </div>
        )}
      </div>

      {/* Details grid */}
      <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
        {place.hours && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(203, 213, 225, 0.7)', fontSize: '14px' }}>
            <Clock size={18} />
            <div>{place.hours}</div>
          </div>
        )}
        {place.address && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', color: 'rgba(203, 213, 225, 0.7)', fontSize: '14px' }}>
            <MapPin size={18} style={{ marginTop: '2px' }} />
            <div>{place.address}</div>
          </div>
        )}
        {place.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '14px' }}>
            <Phone size={18} />
            <a href={`tel:${place.phone}`} style={{ color: 'var(--md-sys-color-primary)', textDecoration: 'none' }}>
              {place.phone}
            </a>
          </div>
        )}
        {place.website && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '14px' }}>
            <Globe size={18} />
            <a href={place.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--md-sys-color-primary)', textDecoration: 'none' }}>
              Visit website
            </a>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button
          onClick={() => onNavigate(place.lat, place.lon, place.name)}
          style={{
            padding: '12px',
            backgroundColor: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Navigation size={16} />
          Directions
        </button>
        {place.phone && (
          <a
            href={`tel:${place.phone}`}
            style={{
              padding: '12px',
              backgroundColor: `rgba(16, 185, 129, 0.12)`,
              color: 'var(--md-sys-color-primary)',
              border: `1px solid var(--md-sys-color-primary)`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}
          >
            <Phone size={16} />
            Call
          </a>
        )}
      </div>
    </article>
  );
};

export default PlaceDetailSheet;
