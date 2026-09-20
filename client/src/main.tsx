import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Globals } from '@react-spring/web';
import App from './App';
import './styles/google-sans-flex.css';
import './styles/material3-theme.css';
import './styles/tokens.css';

// Motion in this app is mostly react-spring, which runs in JS and
// ignores the CSS `prefers-reduced-motion` block in material3-theme.css.
// skipAnimation jumps every spring straight to its end value, so the UI
// still works, it just stops moving. Bound live so toggling the OS
// setting takes effect without a reload.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const applyMotionPreference = () => Globals.assign({ skipAnimation: reduceMotion.matches });
applyMotionPreference();
reduceMotion.addEventListener('change', applyMotionPreference);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
