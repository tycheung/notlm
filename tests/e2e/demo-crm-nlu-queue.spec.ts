import { expect, test } from '@playwright/test';
import {
  coachAddContact,
  confirmYes,
  openChat,
  sendUtterance,
} from './helpers/chat';

test.describe('@guide-nlu demo-crm nlu + queue', () => {
  test('unintelligible utterance offers Add contact', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'blorp noodle');

    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/didn.?t catch that/i)).toBeVisible();
    await expect(page.getByTestId('uipilot-choice-add_contact')).toBeVisible();
  });

  test('add contact asks for name slot then opens draft', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await coachAddContact(page, 'Alex Rivera');
    await expect(page.getByLabel('Contact name')).toBeVisible();
  });

  test('save is blocked until add, then packed queue auto-advances', async ({ page }) => {
    await page.goto('/');
    await openChat(page);

    await sendUtterance(page, 'save contact');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/blocked/i)).toBeVisible();
    await expect(dialog.getByText(/Add contact/i)).toBeVisible();

    await sendUtterance(page, 'add contact then save contact');
    // Packed path skips slot/confirm gates for queue execution.
    await expect(page.getByRole('listitem').filter({ hasText: 'Alex Rivera' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('save contact requires confirm after draft is open', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await coachAddContact(page, 'Alex Rivera');
    await expect(page.getByLabel('Contact name')).toBeVisible();

    await sendUtterance(page, 'save contact');
    await confirmYes(page);
    await expect(page.getByRole('listitem').filter({ hasText: 'Alex Rivera' })).toBeVisible({
      timeout: 10_000,
    });
  });
});
