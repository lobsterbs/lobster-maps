/**
 * Version Indicator
 * Simple semi-transparent text showing version + status
 */

import React from 'react';

const VERSION_INFO = {
  version: '2.0.0-wasm',
  status: 'beta',
};

const VersionIndicator: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 10,
        fontSize: '0.75rem',
        color: 'rgba(203, 213, 225, 0.5)',
        fontFamily: '"Google Sans Flex", sans-serif',
        pointerEvents: 'none',
      }}
    >
      v{VERSION_INFO.version.split('-')[0]} {VERSION_INFO.status}
    </div>
  );
};

export default VersionIndicator;
