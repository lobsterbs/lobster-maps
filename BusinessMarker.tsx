import { animated, useSpring } from '@react-spring/web';

type Props = {
  name: string;
  verified: boolean;
  onClick?: () => void;
};

export function BusinessMarker({ name, verified, onClick }: Props) {
  const style = useSpring({
    from: { scale: 0, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    config: { tension: 300, friction: 12 }, // bouncy drop-in
  });

  const color = verified ? '#E83F3F' : '#D4A574';

  return (
    <animated.button
      onClick={onClick}
      title={name}
      style={{
        transform: style.scale.to((s) => `scale(${s})`),
        transformOrigin: 'bottom center', // scales in from the tip, where it meets the map
        opacity: style.opacity,
        width: 30,
        height: 38,
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))',
      }}
    >
      <svg width="30" height="38" viewBox="0 0 30 38" fill="none">
        <path
          d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.716 23.284 0 15 0z"
          fill={color}
        />
        <circle cx="15" cy="15" r="6" fill="white" fillOpacity="0.92" />
      </svg>
    </animated.button>
  );
}
