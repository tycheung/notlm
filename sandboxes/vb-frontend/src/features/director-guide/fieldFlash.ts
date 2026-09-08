import { GUIDE_FIELD_FLASH_CLASS } from './guideIds';

const FLASH_PULSE_MS = 700;
const FLASH_COUNT = 3;
const WAIT_MS = 8000;
const POLL_MS = 100;

/**
 * Scroll to `[data-guide-id]` and slow-blink outline 3 times, then clear.
 * Returns a cancel function.
 */
export function flashGuideField(guideId: string): () => void {
  let cancelled = false;
  let intervalId: number | null = null;
  let timeoutIds: number[] = [];

  const clearTimers = () => {
    if (intervalId != null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    for (const id of timeoutIds) window.clearTimeout(id);
    timeoutIds = [];
  };

  const runFlash = (el: Element) => {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (el instanceof HTMLElement) {
      try {
        el.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }
    el.classList.remove(GUIDE_FIELD_FLASH_CLASS);
    // Force reflow so re-triggering the animation works.
    void (el as HTMLElement).offsetWidth;
    el.classList.add(GUIDE_FIELD_FLASH_CLASS);
    const clearAt = window.setTimeout(() => {
      if (!cancelled) el.classList.remove(GUIDE_FIELD_FLASH_CLASS);
    }, FLASH_PULSE_MS * FLASH_COUNT);
    timeoutIds.push(clearAt);
  };

  const started = Date.now();
  const tryFind = () => {
    if (cancelled) return;
    const el = document.querySelector(`[data-guide-id="${guideId}"]`);
    if (el) {
      clearTimers();
      runFlash(el);
      return;
    }
    if (Date.now() - started > WAIT_MS) {
      clearTimers();
    }
  };

  tryFind();
  intervalId = window.setInterval(tryFind, POLL_MS);

  return () => {
    cancelled = true;
    clearTimers();
    const el = document.querySelector(`[data-guide-id="${guideId}"]`);
    el?.classList.remove(GUIDE_FIELD_FLASH_CLASS);
  };
}

export const FIELD_FLASH_TOTAL_MS = FLASH_PULSE_MS * FLASH_COUNT;
