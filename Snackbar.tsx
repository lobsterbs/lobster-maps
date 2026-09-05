import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { animated, useTransition } from '@react-spring/web';

type Props = {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
};

// M3's Snackbar: a brief, low-emphasis confirmation at the bottom of
// the screen that dismisses itself, not something the user has to act
// on. Was previously a real gap — submitting a business closed the
// modal with zero feedback that it actually worked. Spring-driven
// slide-up/fade to match the rest of the app's motion language (see
// AddBusinessModal, BusinessDetailSheet) rather than a CSS transition.
export function Snackbar({ message, onDismiss, durationMs = 3500 }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  const transition = useTransition(message, {
    from: { opacity: 0, transform: 'translate(-50%, 16px) scale(0.94)' },
    enter: { opacity: 1, transform: 'translate(-50%, 0px) scale(1)' },
    leave: { opacity: 0, transform: 'translate(-50%, 16px) scale(0.94)' },
    config: { tension: 300, friction: 26 },
  });

  return transition(
    (style, item) =>
      item && (
        <animated.div role="status" style={{ ...style, ...snackbarStyle }} onClick={onDismiss}>
          {item}
        </animated.div>
      )
  );
}

const snackbarStyle: CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: 24,
  zIndex: 20,
  maxWidth: 'min(420px, calc(100vw - 32px))',
  padding: '14px 20px',
  borderRadius: 16,
  background: 'var(--lobster-surface)',
  border: '1px solid rgba(212, 165, 116, 0.25)',
  boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
  color: 'var(--lobster-text)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  cursor: 'pointer',
  textAlign: 'center',
};
