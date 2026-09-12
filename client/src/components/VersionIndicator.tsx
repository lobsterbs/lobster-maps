/**
 * Version Indicator
 * Shows current app version in lower left corner
 * Replaces MapLibre attribution button
 */

import React, { useState } from 'react';
import { GitBranch, Package, ChevronUp } from 'lucide-react';

interface VersionInfo {
  version: string;
  phase: string;
  buildDate: string;
  commit?: string;
  branch?: string;
}

const VERSION_INFO: VersionInfo = {
  version: '2.0.0-wasm',
  phase: 'Phase 2 Complete + WASM Integration',
  buildDate: new Date().toISOString().split('T')[0],
  commit: '0e265dc',
  branch: 'main',
};

export const VersionIndicator: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 10,
      }}
    >
      {/* Expanded tooltip */}
      {expanded && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 8,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgb(71, 85, 105)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            fontSize: '0.75rem',
            color: 'rgb(148, 163, 184)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            width: '16rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Package size={14} style={{ color: '#10b981' }} />
            <span style={{ fontWeight: '600', color: '#34d399' }}>LobsterMaps</span>
            <span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '0.75rem', marginLeft: 'auto' }}>{VERSION_INFO.version}</span>
          </div>

          <div style={{ color: 'rgb(100, 116, 139)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            {VERSION_INFO.phase}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'rgb(120, 113, 108)', paddingTop: '0.25rem', borderTop: '1px solid rgb(71, 85, 105)', marginBottom: '0.5rem' }}>
            <span>{VERSION_INFO.buildDate}</span>
            {VERSION_INFO.commit && (
              <code style={{ fontFamily: 'monospace', color: 'rgb(100, 116, 139)' }}>{VERSION_INFO.commit}</code>
            )}
          </div>

          <div style={{ color: 'rgb(120, 113, 108)', fontSize: '0.75rem', paddingTop: '0.25rem', borderTop: '1px solid rgb(71, 85, 105)' }}>
            ✅ WASM ready (Rate Limiter, Search, Weather)
          </div>
        </div>
      )}

      {/* Compact badge - lower left corner */}
      <button
        onClick={() => setExpanded(!expanded)}
        title="Click for version details"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.5rem 0.75rem',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgb(71, 85, 105)',
          borderRadius: '0.375rem',
          fontSize: '0.75rem',
          color: 'rgb(203, 213, 225)',
          cursor: 'pointer',
          transition: 'all 300ms ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          fontFamily: 'monospace',
          fontWeight: '600',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#34d399';
          e.currentTarget.style.borderColor = '#10b981';
          e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgb(203, 213, 225)';
          e.currentTarget.style.borderColor = 'rgb(71, 85, 105)';
          e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
        }}
      >
        <Package size={12} style={{ color: '#10b981' }} />
        <span>v{VERSION_INFO.version.split('-')[0]}</span>
        <ChevronUp
          size={12}
          style={{
            color: 'rgb(100, 116, 139)',
            transition: 'transform 300ms ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
    </div>
  );
};

export default VersionIndicator;
