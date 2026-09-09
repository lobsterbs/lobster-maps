/**
 * Version Indicator
 * Shows current app version + deployment info
 * Material Design 3 compliant
 */

import React, { useState } from 'react';
import { GitBranch, Package } from 'lucide-react';

interface VersionInfo {
  version: string;
  phase: string;
  buildDate: string;
  commit?: string;
  branch?: string;
}

const VERSION_INFO: VersionInfo = {
  version: '1.0.0-phase2-week5',
  phase: 'Phase 2 Week 5 (UI Enhancements)',
  buildDate: new Date().toISOString().split('T')[0],
  commit: '7ad69f0',
  branch: 'main',
};

export const VersionIndicator: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className="fixed bottom-4 right-4 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all cursor-help"
        title="Click for version details"
      >
        v{VERSION_INFO.version.split('-')[0]}
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-t border-slate-700 p-3 text-xs text-slate-400 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-emerald-400" />
          <span className="font-semibold text-slate-300">LobsterMaps</span>
        </div>
        <span className="text-emerald-400 font-mono">{VERSION_INFO.version}</span>
      </div>

      <div className="flex items-center justify-between text-slate-500">
        <span>{VERSION_INFO.phase}</span>
        <span>{VERSION_INFO.buildDate}</span>
      </div>

      {VERSION_INFO.commit && (
        <div className="flex items-center gap-2 text-slate-600 pt-1 border-t border-slate-700">
          <GitBranch size={12} />
          <code className="font-mono text-slate-500">{VERSION_INFO.commit}</code>
          <span className="text-slate-600">({VERSION_INFO.branch})</span>
        </div>
      )}

      <div className="text-slate-600 text-xs">
        Built with React + TypeScript + Material Design 3 + Rust/WASM
      </div>
    </div>
  );
};

export default VersionIndicator;
