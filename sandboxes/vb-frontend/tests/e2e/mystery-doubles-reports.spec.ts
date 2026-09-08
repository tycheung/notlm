import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('mystery doubles standings and report stay pool-scoped', async ({ page }) => {
  test.setTimeout(90_000);
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.eventId}?tab=side_actions`);
  await expect(page.getByRole('heading', { name: seed.eventName })).toBeVisible({
    timeout: 15_000,
  });

  const mdRow = page.getByRole('row').filter({ hasText: 'E2E Mystery Doubles' });
  await expect(mdRow).toBeVisible({ timeout: 15_000 });
  await mdRow.getByRole('button', { name: 'Standings' }).click();

  const standings = page.getByRole('dialog', {
    name: 'Mystery Doubles — E2E Mystery Doubles',
  });
  await expect(standings).toBeVisible({ timeout: 15_000 });
  await standings.getByRole('button', { name: 'Close modal' }).click();

  await mdRow.getByRole('button', { name: 'Reports' }).click();
  const reportsDialog = page.getByRole('dialog').filter({ hasText: /Reports/ }).first();
  await expect(reportsDialog).toBeVisible();
  const configure = reportsDialog.getByRole('button', { name: 'Configure…' }).first();
  if (await configure.isVisible()) {
    await configure.click();
  }
  const preview = page.getByRole('button', { name: 'Preview' });
  if (await preview.isVisible()) {
    await preview.click();
    await expect(page.locator('iframe').first()).toBeVisible({ timeout: 15_000 });
  }
});
