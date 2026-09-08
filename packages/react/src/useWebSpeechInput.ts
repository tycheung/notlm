import { useCallback, useEffect, useRef, useState } from 'react';
import { getSpeechRecognitionCtor, type SpeechRecognitionLike } from './speech.js';

export function useWebSpeechInput(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Voice unavailable — type instead.');
      return;
    }
    setError(null);
    try {
      const rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        if (!result) return;
        const transcript = result[0]?.transcript?.trim();
        if (transcript && result.isFinal) {
          onFinalRef.current(transcript);
        }
      };
      rec.onerror = (event) => {
        setError(
          event.error === 'not-allowed'
            ? 'Microphone blocked — type instead.'
            : 'Voice unavailable — type instead.'
        );
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setError('Voice unavailable — type instead.');
      setListening(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(
    () => () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
    },
    []
  );

  return {
    supported,
    listening,
    error,
    start,
    stop,
    toggle,
    clearError: () => setError(null),
  };
}
