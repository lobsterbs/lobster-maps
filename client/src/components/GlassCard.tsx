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
      className={`md-glass-surface ${interactive ? 'md-glass-interactive' : ''}`}
      style={{
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'all 200ms ease',
      }}
    >
      {children}
    </div>
  );
};

export default GlassCard;
