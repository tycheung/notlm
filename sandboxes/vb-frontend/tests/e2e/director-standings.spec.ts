import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openEventTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('standings tab shows live board and print preview', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.eventId, 'standings');
  await expect(page.getByRole('heading', { name: 'Standings' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('Alex Ace')).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Print preview' }).click();
  await expect(page.getByRole('button', { name: 'Download HTML' })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole('button', { name: 'Print / Save as PDF' })).toBeVisible();
});
