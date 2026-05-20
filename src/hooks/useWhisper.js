import { useState, useRef, useCallback, useEffect } from 'react';
import { createWhisperClient } from '../api/whisper.js';

export function useWhisper() {
  const [transcript, setTranscript] = useState([]);
  const [status, setStatus] = useState('Bersedia');
  const chunksRef = useRef([]);
  const flushTimerRef = useRef(null);
  const clientRef = useRef(null);

  useEffect(() => {
    clientRef.current = createWhisperClient({
      onTranscript: (text) => {
        setTranscript(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'TRANSCRIPT',
          text,
          timestamp: new Date().toISOString(),
        }]);
      },
      onError: (err) => {
        console.error('Whisper error:', err);
        setStatus('Ralat pentranskripan');
      },
      onStatus: setStatus,
    });
  }, []);

  const flush = useCallback(() => {
    if (chunksRef.current.length === 0) return;
    const chunks = chunksRef.current.splice(0);
    const blob = new Blob(chunks, { type: 'audio/webm' });
    clientRef.current?.enqueue(blob);
  }, []);

  const addChunk = useCallback((chunk) => {
    chunksRef.current.push(chunk);
    if (!flushTimerRef.current) {
      flushTimerRef.current = setInterval(flush, 25000);
    }
  }, [flush]);

  const reset = useCallback(() => {
    clearInterval(flushTimerRef.current);
    flushTimerRef.current = null;
    chunksRef.current = [];
    setTranscript([]);
    setStatus('Bersedia');
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(flushTimerRef.current);
      flush();
    };
  }, [flush]);

  return { transcript, status, addChunk, flush, reset };
}
