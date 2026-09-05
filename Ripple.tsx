import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { animated, useTransition } from '@react-spring/web';

type RippleInstance = {
  id: number;
  x: number;
  y: number;
  size: number;
};

// M3's signature tactile feedback: a circle expanding outward from the
// exact touch point, fading as it grows. Layers on top of whatever
// press/scale animation a button already has, doesn't replace it.
// Spring-driven expand+fade to match the rest of the app's motion
// language (see ClusterMarker, BusinessMarker, AddBusinessFAB) rather
// than a CSS keyframe — this was the one clearly-M3 interaction pattern
// missing everywhere in the app despite everything else being genuinely
// spring-driven.
export function useRipple() {
  const [ripples, setRipples] = useState<RippleInstance[]>([]);
  const idRef = useRef(0);

  const addRipple = useCallback((e: PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Has to reach the farthest corner from the touch point, not just
    // the nearest edge, or the circle visibly clips before it covers
    // the element.
    const size =
      2 *
      Math.max(
        Math.hypot(x, y),
        Math.hypot(rect.width - x, y),
        Math.hypot(x, rect.height - y),
        Math.hypot(rect.width - x, rect.height - y)
      );
    setRipples((prev) => [...prev, { id: idRef.current++, x, y, size }]);
  }, []);

  const removeRipple = useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { ripples, addRipple, removeRipple };
}

type ContainerProps = {
  ripples: RippleInstance[];
  onRippleDone: (id: number) => void;
  color?: string;
};

// Drop this inside any `position: relative | absolute` + `overflow:
// hidden` element. Uses currentColor by default so it inherits the
// element's text color automatically; pass `color` to override.
export function RippleContainer({ ripples, onRippleDone, color }: ContainerProps) {
  const transitions = useTransition(ripples, {
    keys: (r) => r.id,
    from: { scale: 0, opacity: 0.28 },
    enter: { scale: 1, opacity: 0 },
    config: { tension: 120, friction: 26 },
    onRest: (_result, _ctrl, item) => onRippleDone(item.id),
  });

  return (
    <div style={containerStyle}>
      {transitions((style, r) => (
        <animated.span
          style={{
            position: 'absolute',
            left: r.x - r.size / 2,
            top: r.y - r.size / 2,
            width: r.size,
            height: r.size,
            borderRadius: '50%',
            background: color ?? 'currentColor',
            pointerEvents: 'none',
            transform: style.scale.to((s) => `scale(${s})`),
            opacity: style.opacity,
          }}
        />
      ))}
    </div>
  );
}

const containerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  borderRadius: 'inherit',
  pointerEvents: 'none',
};
