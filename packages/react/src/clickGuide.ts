import { DEFAULT_GUIDE_ATTR } from './fieldFlash.js';

export type ClickGuideOpts = {
  attr?: string;
};

/** Click a host control by `data-guide-id` (UI-actions only — no product APIs). */
export function clickGuide(guideId: string, opts?: ClickGuideOpts): boolean {
  const attr = opts?.attr ?? DEFAULT_GUIDE_ATTR;
  const id = guideId.trim();
  if (!id) return false;
  const el = document.querySelector(`[${attr}="${CSS.escape(id)}"]`) as
    | HTMLElement
    | null;
  if (!el) return false;
  el.click();
  return true;
}

/**
 * Resolve a pack `path` token to a guide id click.
 * Tries the path as-is (no leading slash), then the last segment.
 */
export function clickGuideByPath(path: string, opts?: ClickGuideOpts): boolean {
  const trimmed = path.replace(/^\//, '').trim();
  if (!trimmed) return false;
  const candidates = [trimmed];
  const lastSeg = trimmed.split('/').filter(Boolean).pop();
  if (lastSeg && lastSeg !== trimmed) candidates.push(lastSeg);
  for (const guideId of candidates) {
    if (clickGuide(guideId, opts)) return true;
  }
  return false;
}

/** Default navigate for hosts that annotate controls with path === guide id. */
export function createGuideNavigate(
  opts?: ClickGuideOpts & { onMiss?: (path: string) => void }
): (path: string) => void {
  return (path: string) => {
    if (!clickGuideByPath(path, opts)) {
      opts?.onMiss?.(path);
    }
  };
}
