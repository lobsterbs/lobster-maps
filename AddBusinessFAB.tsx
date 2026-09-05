import { animated, useSpring } from '@react-spring/web';
import { useState } from 'react';
import { RippleContainer, useRipple } from './Ripple';

type Props = {
  onClick: () => void;
};

export function AddBusinessFAB({ onClick }: Props) {
  const [pressed, setPressed] = useState(false);
  const { ripples, addRipple, removeRipple } = useRipple();

  const style = useSpring({
    scale: pressed ? 0.92 : 1,
    config: { tension: 400, friction: 18 },
  });

  return (
    <animated.button
      onClick={onClick}
      onPointerDown={(e) => {
        setPressed(true);
        addRipple(e);
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        transform: style.scale.to((s) => `scale(${s})`),
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 16,
        border: 'none',
        background: 'var(--lobster-red)',
        color: 'white',
        fontSize: 28,
        lineHeight: '56px',
        textAlign: 'center',
        fontFamily: 'var(--font-heading)',
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(232, 63, 63, 0.4)',
        overflow: 'hidden',
      }}
      aria-label="Add a business"
    >
      +
      <RippleContainer ripples={ripples} onRippleDone={removeRipple} />
    </animated.button>
  );
}
