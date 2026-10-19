/**
 * ADR-011 routing tree: how-to stays in ask plane (no list create / no nav yank).
 */
import { expect, test } from '@playwright/test';
import { openChat, sendUtterance } from './helpers/chat';

test.describe('@guide-nlu demo-todo routing tree', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('how-to create list does not create a list', async ({ page }) => {
    await openChat(page);
    const before = await page.locator('section ul li').count();
    await sendUtterance(page, 'how do I create a list?');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog).toBeVisible();
    // Must reply somehow; must not silently create.
    await expect
      .poll(async () => page.locator('section ul li').count(), {
        timeout: 8_000,
      })
      .toBe(before);
    const body = await dialog.innerText();
    expect(body.length).toBeGreaterThan(10);
    expect(body.toLowerCase()).not.toMatch(/name the list/i);
  });

  test('imperative create list still coaches create', async ({ page }) => {
    await openChat(page);
    await sendUtterance(page, 'create list');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/name the list|create/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
