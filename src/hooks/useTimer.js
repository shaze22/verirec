import { useState, useRef, useCallback } from 'react';

export function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const start = useCallback(() => {
    startTimeRef.current = Date.now() - elapsed * 1000;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [elapsed]);

  const pause = useCallback(() => {
    clearInterval(intervalRef.current);
  }, []);

  const resume = useCallback(() => {
    startTimeRef.current = Date.now() - elapsed * 1000;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [elapsed]);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setElapsed(0);
    startTimeRef.current = null;
  }, []);

  // Restore elapsed seconds without starting the timer (used when resuming a saved session)
  const restore = useCallback((seconds) => {
    clearInterval(intervalRef.current);
    setElapsed(seconds || 0);
    startTimeRef.current = null;
  }, []);

  const format = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return { elapsed, formatted: format(elapsed), start, pause, resume, stop, reset, restore };
}
