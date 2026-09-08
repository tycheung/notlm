import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('event create fills EventForm past the format picker and lands on details', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/tournaments/${seed.tournamentId}`);
  await expect(page.getByRole('heading', { name: seed.tournamentName })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: 'Add Event' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create New Event' });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await expect(dialog.getByText('Event Details')).toBeVisible();

  const eventName = `E2E Created ${Date.now()}`;
  await dialog.getByLabel('Event Name').fill(eventName);
  const scoring = dialog.locator('select').filter({ hasText: 'Scratch' }).first();
  if ((await scoring.count()) > 0) {
    await scoring.selectOption('scratch');
  }
  const format = dialog.locator('select').filter({ hasText: 'Singles Event' }).first();
  if ((await format.count()) > 0) {
    await format.selectOption({ label: 'Singles Event' });
  }
  await dialog.getByRole('button', { name: 'Create Event' }).click();
  // Successful create navigates into the new event details page
  await expect(page).toHaveURL(/\/director\/events\/\d+/, { timeout: 30000 });
  await expect(page.getByRole('heading', { name: eventName })).toBeVisible({ timeout: 30000 });
});
