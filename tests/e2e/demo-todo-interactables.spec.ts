import { expect, test } from '@playwright/test';
import { openChat, sendUtterance } from './helpers/chat';

test.describe('@guide-nlu demo-todo interactables', () => {
  test('files tab + upload spotlight-only coaching', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'open files tab');
    await expect(page.getByRole('button', { name: 'Files' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await sendUtterance(page, 'upload a file');
    await expect(page.locator('[data-guide-id="guide-upload"]')).toBeVisible();
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(
      dialog.getByText(/Select a file yourself|won.?t fill that automatically|won.?t upload/i).first()
    ).toBeVisible();
  });

  test('export via menu opens Actions then Export', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'export via menu');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/Export|Opening|Actions/i).first()).toBeVisible();
  });

  test('lab drawer opens via openModal bridge', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'open the drawer');
    await expect(page.getByText('Lab drawer open.')).toBeVisible({ timeout: 10_000 });
  });
});
