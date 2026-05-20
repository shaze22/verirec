import { useEffect, useRef } from 'react';

const BARS = 20;

export function Waveform({ level, isRecording, isPaused }) {
  const barsRef = useRef([]);
  const rafRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const animate = () => {
      frameRef.current += 0.08;
      barsRef.current.forEach((el, i) => {
        if (!el) return;
        const active = isRecording && !isPaused;
        if (active) {
          const h = Math.max(4, (level / 100) * 44 * ((Math.sin(frameRef.current + i * 0.5) + 1) / 2) + 4);
          el.style.height = `${h}px`;
          el.style.backgroundColor = `hsl(${220 + (level / 100) * 20}, 80%, 55%)`;
        } else {
          el.style.height = '4px';
          el.style.backgroundColor = '#d1d5db';
        }
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [level, isRecording, isPaused]);

  return (
    <div className="flex items-end gap-0.5 h-12">
      {Array.from({ length: BARS }).map((_, i) => (
        <div
          key={i}
          ref={el => { barsRef.current[i] = el; }}
          className="w-1 rounded-full"
          style={{ height: '4px', backgroundColor: '#d1d5db', transition: 'height 60ms ease' }}
        />
      ))}
    </div>
  );
}
