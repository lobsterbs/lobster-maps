import { animated, useSpring } from '@react-spring/web';

type Props = {
  count: number;
  onClick?: () => void;
};

export function ClusterMarker({ count, onClick }: Props) {
  const style = useSpring({
    from: { scale: 0, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    config: { tension: 300, friction: 14 },
  });

  // Grows gently with count, capped so a huge cluster doesn't take over the screen
  const size = Math.min(56, 32 + Math.log(count) * 8);

  return (
    <animated.button
      onClick={onClick}
      title={`${count} businesses`}
      style={{
        transform: style.scale.to((s) => `scale(${s})`),
        opacity: style.opacity,
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.85)',
        background: 'var(--lobster-red)',
        color: 'white',
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        padding: 0,
      }}
    >
      {count}
    </animated.button>
  );
}
