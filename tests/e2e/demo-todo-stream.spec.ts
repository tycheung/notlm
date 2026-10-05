/**
 * @guide-stream Minimal stream fallback smoke (fixture iterable).
 */
import { test, expect } from '@playwright/test';

test.describe('@guide-stream demo-todo stream fallback wiring', () => {
  test('chat panel opens and composer is present', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('notlm-fab').click();
    await expect(page.getByTestId('notlm-chat-panel')).toBeVisible();
    await expect(page.getByTestId('notlm-chat-input')).toBeVisible();
    await expect(page.getByTestId('notlm-thread-list')).toBeVisible();
  });
});
