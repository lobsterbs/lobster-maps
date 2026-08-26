import { animated, useSpring } from '@react-spring/web';
import { useState } from 'react';

type Props = {
  onClick: () => void;
};

export function AddBusinessFAB({ onClick }: Props) {
  const [pressed, setPressed] = useState(false);

  const style = useSpring({
    scale: pressed ? 0.92 : 1,
    config: { tension: 400, friction: 18 },
  });

  return (
    <animated.button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
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
      }}
      aria-label="Add a business"
    >
      +
    </animated.button>
  );
}
