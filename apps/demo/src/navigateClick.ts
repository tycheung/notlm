export function clickGuideByPath(path: string) {
  const guideId = path.replace(/^\//, '');
  const el = document.querySelector(
    `[data-guide-id="${CSS.escape(guideId)}"]`
  ) as HTMLElement | null;
  if (!el) {
    console.warn(`[demo] No control for data-guide-id="${guideId}"`);
    return;
  }
  el.click();
}
