import { useState, useRef, useCallback, useEffect } from 'react';
import { createWhisperClient } from '../api/whisper.js';

export function useWhisper({ lang = 'auto' } = {}) {
  const [transcript, setTranscript] = useState([]);
  const [status, setStatus] = useState('Bersedia');
  const chunksRef = useRef([]);
  const flushTimerRef = useRef(null);
  const clientRef = useRef(null);
  const isFlushing = useRef(false);
  const langRef = useRef(lang);

  useEffect(() => { langRef.current = lang; }, [lang]);

  useEffect(() => {
    clientRef.current = createWhisperClient({
      onTranscript: (text) => {
        setTranscript(prev => {
          const next = [...prev, {
            id: crypto.randomUUID(),
            type: 'TRANSCRIPT',
            text,
            timestamp: new Date().toISOString(),
          }];
          return next.length > 500 ? next.slice(next.length - 500) : next;
        });
      },
      onError: (err) => {
        console.error('Whisper error:', err);
        setStatus('Ralat pentranskripan');
      },
      onStatus: setStatus,
      get lang() { return langRef.current; },
    });
  }, []);

  const flush = useCallback(() => {
    if (chunksRef.current.length === 0 || isFlushing.current) return;
    isFlushing.current = true;
    const chunks = chunksRef.current.splice(0);
    const blob = new Blob(chunks, { type: 'audio/webm' });
    // Skip blobs < 4KB — too short for Whisper to detect any speech
    if (blob.size >= 4096) {
      clientRef.current?.enqueue(blob);
    }
    isFlushing.current = false;
  }, []);

  const addChunk = useCallback((chunk) => {
    chunksRef.current.push(chunk);
    if (!flushTimerRef.current) {
      flushTimerRef.current = setInterval(flush, 2000);
    }
  }, [flush]);

  const reset = useCallback(() => {
    clearInterval(flushTimerRef.current);
    flushTimerRef.current = null;
    chunksRef.current = [];
    isFlushing.current = false;
    setTranscript([]);
    setStatus('Bersedia');
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(flushTimerRef.current);
      // Only flush on unmount if there are actually chunks waiting
      if (chunksRef.current.length > 0) flush();
    };
  }, [flush]);

  return { transcript, status, addChunk, flush, reset };
}
