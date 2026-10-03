/**
 * Scroll to `[data-guide-id]` and pulse a CSS class (host supplies styles).
 * Single-field and sequential multi-field tours (user-must-fill).
 */

const FLASH_PULSE_MS = 700;
const FLASH_COUNT = 3;
const FIELD_GAP_MS = 250;
const WAIT_MS = 8000;
const POLL_MS = 100;

export const DEFAULT_FLASH_CLASS = 'notlm-field-flash';
export const DEFAULT_GUIDE_ATTR = 'data-guide-id';

export type FlashFieldOpts = {
  attr?: string;
  flashClass?: string;
};

function clearClass(el: Element | null, flashClass: string): void {
  el?.classList.remove(flashClass);
}

function isEmptyFillable(el: Element): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return !el.value.trim();
  }
  if (el instanceof HTMLSelectElement) return !el.value;
  return true;
}

/** Document order (top → bottom, then left → right). */
export function sortGuideIdsByDocumentOrder(
  guideIds: string[],
  attr: string = DEFAULT_GUIDE_ATTR
): string[] {
  const rows: Array<{ id: string; el: Element }> = [];
  for (const id of guideIds) {
    const el = document.querySelector(`[${attr}="${CSS.escape(id)}"]`);
    if (el) rows.push({ id, el });
  }
  rows.sort((a, b) => {
    const pos = a.el.compareDocumentPosition(b.el);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
  return rows.map((r) => r.id);
}

function pulseElement(el: Element, flashClass: string): void {
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
}

/**
 * Find `[data-guide-id]`, scroll into view, blink `FLASH_COUNT` times.
 * Returns a cancel function.
 */
export function flashGuideField(guideId: string, opts?: FlashFieldOpts): () => void {
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
    pulseElement(el, flashClass);
    timeoutIds.push(
      window.setTimeout(() => {
        if (!cancelled) clearClass(el, flashClass);
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
    clearClass(document.querySelector(`[${attr}="${CSS.escape(guideId)}"]`), flashClass);
  };
}

export type SequentialFlashOpts = FlashFieldOpts & {
  /** When true, skip inputs/selects that already have a value. Default false. */
  onlyEmpty?: boolean;
  /** Delay between finishing one field and starting the next. */
  gapMs?: number;
};

/**
 * Tour fields top→bottom: scroll each into view and blink 3× before moving on.
 * Use for pack `userFill` guide ids the coach cannot type for the user.
 */
export function flashGuideFieldsSequential(
  guideIds: string[],
  opts?: SequentialFlashOpts
): () => void {
  const attr = opts?.attr ?? DEFAULT_GUIDE_ATTR;
  const flashClass = opts?.flashClass ?? DEFAULT_FLASH_CLASS;
  const gapMs = opts?.gapMs ?? FIELD_GAP_MS;
  const onlyEmpty = opts?.onlyEmpty === true;
  let cancelled = false;
  let timeoutIds: number[] = [];
  let activeEl: Element | null = null;

  const clearTimers = () => {
    for (const id of timeoutIds) window.clearTimeout(id);
    timeoutIds = [];
  };

  const cancel = () => {
    cancelled = true;
    clearTimers();
    clearClass(activeEl, flashClass);
    activeEl = null;
  };

  const ordered = sortGuideIdsByDocumentOrder(guideIds, attr).filter((id) => {
    const el = document.querySelector(`[${attr}="${CSS.escape(id)}"]`);
    if (!el) return false;
    if (onlyEmpty && !isEmptyFillable(el)) return false;
    return true;
  });

  if (!ordered.length) return cancel;

  const flashOne = (index: number) => {
    if (cancelled || index >= ordered.length) return;
    const id = ordered[index]!;
    const el = document.querySelector(`[${attr}="${CSS.escape(id)}"]`);
    if (!el) {
      flashOne(index + 1);
      return;
    }
    activeEl = el;
    pulseElement(el, flashClass);
    const holdMs = FLASH_PULSE_MS * FLASH_COUNT;
    timeoutIds.push(
      window.setTimeout(() => {
        if (cancelled) return;
        clearClass(el, flashClass);
        if (index + 1 >= ordered.length) {
          activeEl = null;
          return;
        }
        timeoutIds.push(
          window.setTimeout(() => {
            if (!cancelled) flashOne(index + 1);
          }, gapMs)
        );
      }, holdMs)
    );
  };

  // Allow DOM to settle after navigate/prefill.
  timeoutIds.push(window.setTimeout(() => flashOne(0), 0));

  return cancel;
}
