import { useCallback, useEffect, useRef, useState } from 'react';

export type SpotlightState = {
  guideId: string;
  message: string;
} | null;

const WAIT_MS = 8000;
const POLL_MS = 100;

export function useSpotlightController() {
  const [spotlight, setSpotlight] = useState<SpotlightState>(null);
  const timerRef = useRef<number | null>(null);

  const clearSpotlight = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSpotlight(null);
  }, []);

  const showSpotlight = useCallback((guideId: string, message: string) => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const started = Date.now();
    const tryFind = () => {
      const el = document.querySelector(`[data-guide-id="${guideId}"]`);
      if (el) {
        if (timerRef.current != null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setSpotlight({ guideId, message });
        return;
      }
      if (Date.now() - started > WAIT_MS) {
        if (timerRef.current != null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Still show coach message even if target missing (navigated but control gated).
        setSpotlight({ guideId, message });
      }
    };

    tryFind();
    timerRef.current = window.setInterval(tryFind, POLL_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current);
    };
  }, []);

  return { spotlight, showSpotlight, clearSpotlight };
}
