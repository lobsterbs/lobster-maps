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
      className="fixed bottom-4 left-4 z-10"
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
          className="absolute bottom-12 left-0 mb-2 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg p-3 text-xs text-slate-400 space-y-2 w-64"
          style={{
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center gap-2">
            <Package size={14} className="text-emerald-500" />
            <span className="font-semibold text-emerald-400">LobsterMaps</span>
            <span className="text-emerald-600 font-mono text-xs ml-auto">{VERSION_INFO.version}</span>
          </div>

          <div className="text-slate-500 text-xs">
            {VERSION_INFO.phase}
          </div>

          <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-700">
            <span>{VERSION_INFO.buildDate}</span>
            {VERSION_INFO.commit && (
              <code className="font-mono text-slate-500">{VERSION_INFO.commit}</code>
            )}
          </div>

          <div className="text-slate-600 text-xs pt-1 border-t border-slate-700">
            ✅ WASM ready (Rate Limiter, Search, Weather)
          </div>
        </div>
      )}

      {/* Compact badge - lower left corner */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-md text-xs text-slate-300 hover:text-emerald-400 hover:border-emerald-600 hover:bg-slate-800/80 transition-all cursor-pointer"
        title="Click for version details"
        style={{
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <Package size={12} className="text-emerald-500" />
        <span className="font-mono font-semibold">v{VERSION_INFO.version.split('-')[0]}</span>
        <ChevronUp
          size={12}
          className="text-slate-600 transition-transform"
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
    </div>
  );
};

export default VersionIndicator;
