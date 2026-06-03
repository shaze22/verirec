import { useState, useRef, useCallback, useEffect } from 'react';

const SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export const isSpeechRecognitionSupported = !!SR;

// Map 'auto' to a valid BCP47 tag — Web Speech API rejects 'auto' outright.
// ms-MY is the primary; onerror fallback chain handles ms → en-MY → en-US.
function detectBestLang(preferred) {
  if (preferred === 'auto') return 'ms-MY';
  return preferred;
}

export function useRealtimeTranscript({ onFinalResult, lang = 'ms-MY' } = {}) {
  const [interim, setInterim] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const isActiveRef = useRef(false);
  const restartTimerRef = useRef(null);
  const onFinalRef = useRef(onFinalResult);
  const langRef = useRef(detectBestLang(lang));

  useEffect(() => { onFinalRef.current = onFinalResult; }, [onFinalResult]);

  const createRecognition = useCallback(() => {
    if (!SR) return null;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langRef.current;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) onFinalRef.current?.(text);
          setInterim('');
        } else {
          interimText += result[0].transcript;
        }
      }
      if (interimText) setInterim(interimText);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      // language-not-supported → fall back to ms then en-MY then en-US
      if (event.error === 'language-not-supported') {
        const fallbacks = ['ms', 'en-MY', 'en-US'];
        const next = fallbacks.find(f => f !== langRef.current);
        if (next) { langRef.current = next; }
      }
      console.warn('SpeechRecognition error:', event.error);
    };

    // Chrome silently stops after ~60s or on silence — restart immediately
    recognition.onend = () => {
      setInterim('');
      if (!isActiveRef.current) return;
      // Small delay prevents rapid-fire restart loops
      restartTimerRef.current = setTimeout(() => {
        if (!isActiveRef.current) return;
        try {
          recognitionRef.current = createRecognition();
          recognitionRef.current?.start();
        } catch {}
      }, 150);
    };

    return recognition;
  }, []);

  const start = useCallback(() => {
    if (!SR || isActiveRef.current) return;
    isActiveRef.current = true;
    setIsListening(true);
    recognitionRef.current = createRecognition();
    try {
      recognitionRef.current?.start();
    } catch (err) {
      console.error('SpeechRecognition start failed:', err);
      isActiveRef.current = false;
      setIsListening(false);
    }
  }, [createRecognition]);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    setIsListening(false);
    setInterim('');
    clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      clearTimeout(restartTimerRef.current);
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  return { interim, isListening, start, stop };
}
