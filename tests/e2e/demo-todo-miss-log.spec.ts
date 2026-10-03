import { expect, test } from '@playwright/test';
import { openChat, sendUtterance } from './helpers/chat';

const MISS_KEY = 'notlm:demo-todo:misses';

test.describe('@guide-nlu demo-todo miss logging', () => {
  test('unknown utterance is stored in localStorage and deduped', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => localStorage.removeItem(key), MISS_KEY);
    await openChat(page);

    const nonsense = 'xyzzy plugh frobnicate the waffle iron';
    await sendUtterance(page, nonsense);
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(
      dialog.getByText(/didn.?t catch|not sure|try|help|what can/i).first()
    ).toBeVisible({ timeout: 10_000 });

    const first = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Array<{ text: string; kind: string }>) : [];
    }, MISS_KEY);
    expect(first.length).toBeGreaterThanOrEqual(1);
    expect(first.some((r) => r.text.includes('xyzzy') && r.kind === 'unknown')).toBe(true);

    await sendUtterance(page, nonsense);
    const second = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as unknown[]) : [];
    }, MISS_KEY);
    expect(second.length).toBe(first.length);
  });
});
