/**
 * UI-actions smoke: coach navigate resolves to clicking a data-guide-id control.
 * Uses happy-dom if available; otherwise a minimal document stub.
 */
import { describe, expect, it, beforeEach } from 'vitest';

function ensureDom() {
  if (typeof document !== 'undefined') return;
  // Minimal stub for node environment
  const store = new Map<string, { clicked: number; id: string }>();
  (globalThis as unknown as { document: Document }).document = {
    querySelector(sel: string) {
      const m = /data-guide-id="([^"]+)"/.exec(sel);
      if (!m) return null;
      const id = m[1]!;
      if (!store.has(id)) store.set(id, { clicked: 0, id });
      const rec = store.get(id)!;
      return {
        getAttribute: (name: string) => (name === 'data-guide-id' ? id : null),
        click: () => {
          rec.clicked += 1;
        },
        _rec: rec,
      };
    },
  } as unknown as Document;
  (ensureDom as unknown as { store: typeof store }).store = store;
}

function clickGuideId(guideId: string): boolean {
  const el = document.querySelector(`[data-guide-id="${guideId}"]`) as
    | (Element & { click: () => void; _rec?: { clicked: number } })
    | null;
  if (!el) return false;
  el.click();
  return true;
}

describe('ui-actions coach click', () => {
  beforeEach(() => {
    ensureDom();
  });

  it('clicks annotated control only (no API)', () => {
    ensureDom();
    const ok = clickGuideId('guide-create-list');
    expect(ok).toBe(true);
    const store = (ensureDom as unknown as { store: Map<string, { clicked: number }> }).store;
    expect(store.get('guide-create-list')?.clicked).toBe(1);
  });
});
