/**
 * Glass Card Component
 * Reusable dark glass morphism card (inspired by 21st.dev patterns)
 */

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  interactive?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, onClick, interactive = false }) => {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'all 200ms ease',
      }}
      onMouseEnter={(e) => {
        if (interactive) {
          e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.7)';
          e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (interactive) {
          e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
          e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)';
        }
      }}
    >
      {children}
    </div>
  );
};

export default GlassCard;
