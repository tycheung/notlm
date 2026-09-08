/**
 * UI-actions only (ADR-003): the coach never POSTs or calls product APIs.
 * `navigate` from UiPilotHost / executeStep resolves to clicking a
 * `[data-guide-id]` control (path token === guide id in this demo pack).
 */
export function clickGuideByPath(path: string): void {
  const trimmed = path.replace(/^\//, '').trim();
  // Prefer path token as guide id (pack controls use path === id === spotlight).
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
