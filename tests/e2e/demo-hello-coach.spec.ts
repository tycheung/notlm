import { expect, test } from '@playwright/test';
import { openChat, sendUtterance } from './helpers/chat';

test.describe('@guide-nlu @third-host demo-hello coach', () => {
  test('say hello via coach — UI click only', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'demo-hello' })).toBeVisible();

    await openChat(page);
    await sendUtterance(page, 'say hello');
    await expect(page.getByTestId('hello-done')).toBeVisible({ timeout: 10_000 });
  });
});
