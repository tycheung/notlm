/**
 * UI-actions only (ADR-003): coach never POSTs / never calls product APIs.
 * Host `navigate` clicks `[data-guide-id]` (path token === guide id).
 */
export function clickGuideByPath(path: string): void {
  const guideId = path.replace(/^\//, '');
  const el = document.querySelector(
    `[data-guide-id="${CSS.escape(guideId)}"]`
  ) as HTMLElement | null;
  if (!el) {
    console.warn(`[demo-crm] No control for data-guide-id="${guideId}"`);
    return;
  }
  el.click();
}
