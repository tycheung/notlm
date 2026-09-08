import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openEventTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('format editor loads H2H matchups and settings modal', async ({ page }) => {
  const seed = getLiveSeed();
  test.skip(!seed.bakerEventId, 'Baker event was not seeded');

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.bakerEventId!, 'format_editor');
  await expect(page.getByRole('heading', { name: 'Format Editor' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('Selected')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible();

  await page.getByRole('button', { name: 'Edit settings…' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit round format' })).toBeVisible({
    timeout: 15000,
  });
});
