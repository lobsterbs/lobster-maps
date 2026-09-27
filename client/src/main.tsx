import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Globals } from '@react-spring/web';
import { M3eThemeElement } from '@m3e/web/theme';
import App from './App';
import './styles/google-sans-flex.css';
import './styles/material3-theme.css';
import './styles/tokens.css';

// Register M3eTheme globally BEFORE React mounts
if (!customElements.get('m3e-theme')) {
  customElements.define('m3e-theme', M3eThemeElement);
}

// Mount theme wrapper in DOM
const themeEl = document.createElement('m3e-theme');
document.documentElement.appendChild(themeEl);

// Motion in this app is mostly react-spring, which runs in JS and
// ignores the CSS `prefers-reduced-motion` block in material3-theme.css.
// skipAnimation jumps every spring straight to its end value, so the UI
// still works, it just stops moving. Bound live so toggling the OS
// setting takes effect without a reload.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const applyMotionPreference = () => Globals.assign({ skipAnimation: reduceMotion.matches });
applyMotionPreference();
reduceMotion.addEventListener('change', applyMotionPreference);

// Error boundary for debugging
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:20px; color:red; font-family:monospace; white-space:pre-wrap; background:#1a1a1a;"><strong>Error:</strong> ${e.error?.message || 'Unknown error'}</div>`;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
