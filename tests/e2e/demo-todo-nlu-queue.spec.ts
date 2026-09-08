import { expect, test, type Page } from '@playwright/test';

test.describe('@guide-nlu demo-todo nlu + queue', () => {
  async function openChat(page: Page) {
    await page.getByTestId('uipilot-fab').click();
    await expect(page.getByRole('dialog', { name: 'Assistant' })).toBeVisible();
  }

  async function sendUtterance(page: Page, text: string) {
    await page.getByTestId('uipilot-chat-input').fill(text);
    await page.getByTestId('uipilot-chat-send').click();
  }

  test('unintelligible utterance offers next DAG step', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'asdf qwer zxcv');

    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/didn.?t catch that/i)).toBeVisible();
    await expect(dialog.getByText(/Create list/i)).toBeVisible();
    await expect(page.getByText('No lists yet')).toBeVisible();
  });

  test('packed queue blocks on DAG gap then injects and resumes', async ({ page }) => {
    await page.goto('/');
    await openChat(page);

    // Skip add_item in the packed request — complete_item requires it.
    await sendUtterance(page, 'create list then complete item');

    await expect(page.getByRole('listitem').filter({ hasText: 'Shopping' })).toBeVisible();

    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/blocked/i)).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText(/Add item/i)).toBeVisible();

    await sendUtterance(page, 'add item');
    await expect(page.getByRole('listitem').filter({ hasText: 'Milk' })).toBeVisible();

    // After add_item completes, queue should auto-resume complete_item.
    await expect(page.locator('li.done').filter({ hasText: 'Milk' })).toBeVisible({
      timeout: 10_000,
    });
  });
});
