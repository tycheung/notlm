import { expect, test, type Page } from '@playwright/test';

test.describe('@guide-nlu demo-crm nlu + queue', () => {
  async function openChat(page: Page) {
    await page.getByTestId('uipilot-fab').click();
    await expect(page.getByRole('dialog', { name: 'Assistant' })).toBeVisible();
  }

  async function sendUtterance(page: Page, text: string) {
    await page.getByTestId('uipilot-chat-input').fill(text);
    await page.getByTestId('uipilot-chat-send').click();
  }

  test('unintelligible utterance offers Add contact', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'blorp noodle');

    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/didn.?t catch that/i)).toBeVisible();
    await expect(page.getByTestId('uipilot-choice-add_contact')).toBeVisible();
  });

  test('save is blocked until add, then packed queue auto-advances', async ({ page }) => {
    await page.goto('/');
    await openChat(page);

    await sendUtterance(page, 'save contact');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/blocked/i)).toBeVisible();
    await expect(dialog.getByText(/Add contact/i)).toBeVisible();

    await sendUtterance(page, 'add contact then save contact');
    // Draft may close after auto-save; assert the committed contact.
    await expect(page.getByText('Alex Rivera')).toBeVisible({ timeout: 10_000 });
  });
});
