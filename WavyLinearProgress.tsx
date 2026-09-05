import { useEffect, useRef } from 'react';

type Props = {
  width?: number;
  height?: number;
  color?: string;
};

// M3 Expressive's wavy linear progress: a sinusoidal wave scrolling along
// the track instead of a flat bar fill. Unlike the circular indicator,
// there's no Google shape asset behind this to port faithfully or not —
// it's a sine wave, so plain trigonometry gets it exactly right.
//
// Animated via requestAnimationFrame mutating the polyline's `points`
// directly through a ref, not React state, so a 60fps redraw doesn't
// trigger a React re-render every frame.
export function WavyLinearProgress({ width = 240, height = 16, color = '#E83F3F' }: Props) {
  const polylineRef = useRef<SVGPolylineElement>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const wavelength = 18;
    const amplitude = height * 0.28;
    const midY = height / 2;
    let raf: number;

    function draw() {
      offsetRef.current = (offsetRef.current + 0.6) % wavelength;
      const points: string[] = [];
      for (let x = -wavelength; x <= width + wavelength; x += 2) {
        const y = midY + Math.sin(((x + offsetRef.current) / wavelength) * Math.PI * 2) * amplitude;
        points.push(`${x},${y.toFixed(2)}`);
      }
      polylineRef.current?.setAttribute('points', points.join(' '));
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <div style={{ width, height, overflow: 'hidden' }}>
      <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
        <polyline ref={polylineRef} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
      </svg>
    </div>
  );
}
