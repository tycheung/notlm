import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_GUIDE_ATTR } from './fieldFlash.js';

export type SpotlightState = {
  guideId: string;
  message: string;
} | null;

const WAIT_MS = 8000;
const POLL_MS = 100;

export function useSpotlightController(guideAttr: string = DEFAULT_GUIDE_ATTR) {
  const [spotlight, setSpotlight] = useState<SpotlightState>(null);
  const timerRef = useRef<number | null>(null);

  const clearSpotlight = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSpotlight(null);
  }, []);

  const showSpotlight = useCallback(
    (guideId: string, message: string) => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const started = Date.now();
      const selector = `[${guideAttr}="${CSS.escape(guideId)}"]`;
      const tryFind = () => {
        const el = document.querySelector(selector);
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
          setSpotlight({ guideId, message });
        }
      };

      tryFind();
      timerRef.current = window.setInterval(tryFind, POLL_MS);
    },
    [guideAttr]
  );

  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current);
    },
    []
  );

  return { spotlight, showSpotlight, clearSpotlight };
}
