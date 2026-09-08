/**
 * Scroll to `[data-guide-id]` and pulse a CSS class (host supplies styles).
 * Trimmed from VB fieldFlash — attribute name configurable later.
 */

const FLASH_PULSE_MS = 700;
const FLASH_COUNT = 3;
const WAIT_MS = 8000;
const POLL_MS = 100;

export const DEFAULT_FLASH_CLASS = 'uipilot-field-flash';
export const DEFAULT_GUIDE_ATTR = 'data-guide-id';

export function flashGuideField(
  guideId: string,
  opts?: { attr?: string; flashClass?: string }
): () => void {
  const attr = opts?.attr ?? DEFAULT_GUIDE_ATTR;
  const flashClass = opts?.flashClass ?? DEFAULT_FLASH_CLASS;
  let cancelled = false;
  let intervalId: number | null = null;
  let timeoutIds: number[] = [];

  const clearTimers = () => {
    if (intervalId != null) window.clearInterval(intervalId);
    intervalId = null;
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
    el.classList.remove(flashClass);
    void (el as HTMLElement).offsetWidth;
    el.classList.add(flashClass);
    timeoutIds.push(
      window.setTimeout(() => {
        if (!cancelled) el.classList.remove(flashClass);
      }, FLASH_PULSE_MS * FLASH_COUNT)
    );
  };

  const started = Date.now();
  const tryFind = () => {
    if (cancelled) return;
    const el = document.querySelector(`[${attr}="${CSS.escape(guideId)}"]`);
    if (el) {
      clearTimers();
      runFlash(el);
      return;
    }
    if (Date.now() - started > WAIT_MS) clearTimers();
  };

  tryFind();
  intervalId = window.setInterval(tryFind, POLL_MS);

  return () => {
    cancelled = true;
    clearTimers();
    document.querySelector(`[${attr}="${CSS.escape(guideId)}"]`)?.classList.remove(flashClass);
  };
}
