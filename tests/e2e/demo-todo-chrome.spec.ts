/**
 * @guide-chrome FAB / chat panel / thread list smoke.
 */
import { test, expect } from '@playwright/test';

test.describe('@guide-chrome demo-todo chrome smoke (FAB/chat/threads)', () => {
  test('chat panel opens and composer is present', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('notlm-fab').click();
    await expect(page.getByTestId('notlm-chat-panel')).toBeVisible();
    await expect(page.getByTestId('notlm-chat-input')).toBeVisible();
    await expect(page.getByTestId('notlm-thread-list')).toBeVisible();
  });
});
