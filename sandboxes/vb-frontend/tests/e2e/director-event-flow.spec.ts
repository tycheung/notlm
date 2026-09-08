import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('event flow page is read-only for edges and opens round settings', async ({ page }) => {
  const seed = getLiveSeed();
  const eventId = seed.payoutEventId ?? seed.mixedEventId;
  test.skip(!eventId, 'No mixed/payout event was seeded');

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${eventId}/flow`);
  await expect(page.getByRole('heading', { name: 'Event Flow' })).toBeVisible({
    timeout: 15000,
  });

  await page.getByText('Qualifying').first().dblclick();
  await expect(page.getByRole('dialog', { name: 'Edit round format' })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: 'Close modal' }).click();

  const edge = page.locator('.react-flow__edge').first();
  if ((await edge.count()) > 0) {
    await edge.dblclick({ force: true });
    await expect(
      page.getByText('This flow view is read-only. Edit structure from the Event Format Wizard.')
    ).toBeVisible({ timeout: 10000 });
  }
});
