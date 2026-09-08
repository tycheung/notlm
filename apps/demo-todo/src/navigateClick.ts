/**
 * Coach never POSTs or calls product APIs.
 * `navigate` from UiPilotHost / executeStep clicks `[data-guide-id]`
 * (path token === guide id in this demo pack).
 */
export function clickGuideByPath(path: string): void {
  const trimmed = path.replace(/^\//, '').trim();
  const candidates = [trimmed];
  const lastSeg = trimmed.split('/').filter(Boolean).pop();
  if (lastSeg && lastSeg !== trimmed) candidates.push(lastSeg);

  for (const guideId of candidates) {
    const el = document.querySelector(
      `[data-guide-id="${CSS.escape(guideId)}"]`
    ) as HTMLElement | null;
    if (el) {
      el.click();
      return;
    }
  }
  console.warn(`[demo-todo] No control for data-guide-id from path="${path}"`);
}
