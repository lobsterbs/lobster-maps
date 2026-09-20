/**
 * Version indicator.
 *
 * Used to hardcode "v2.0.0-wasm". The WASM build did not exist and the
 * server was running Node fallbacks for everything, so the badge was
 * advertising a backend that was never loaded. It now asks the server
 * what is actually running.
 */

import React, { useEffect, useState } from 'react';

const VERSION = '2.1.0';

type Backend = 'wasm' | 'node' | 'unknown';

const VersionIndicator: React.FC = () => {
  const [backend, setBackend] = useState<Backend>('unknown');

  useEffect(() => {
    let cancelled = false;
    fetch('/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setBackend(d.wasm?.active ? 'wasm' : 'node');
      })
      .catch(() => {
        /* badge is cosmetic; a failed probe just leaves it unknown */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      v{VERSION}
      {backend !== 'unknown' && ` · ${backend === 'wasm' ? 'rust/wasm' : 'node'}`}
    </div>
  );
};

export default VersionIndicator;
