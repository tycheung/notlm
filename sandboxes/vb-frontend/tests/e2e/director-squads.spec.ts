import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openEventTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('squads tab can move, lock, and open re-entry', async ({ page }) => {
  const seed = getLiveSeed();
  test.skip(!seed.opsEventId, 'Ops squads event was not seeded');

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.opsEventId!, 'squads');
  await expect(page.getByRole('heading', { name: /Squads Management/i })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('Alpha Squad')).toBeVisible();
  await expect(page.getByText('Bravo Squad')).toBeVisible();
  await expect(page.getByText('Ops3 Bowler')).toBeVisible();

  await page.getByRole('checkbox').nth(2).check();
  await page.getByRole('button', { name: /Move selected/ }).click();
  await page.getByRole('button', { name: 'Bravo Squad', exact: true }).click();
  await page.getByRole('button', { name: /Move to Bravo Squad/ }).click();
  const save = page.getByRole('button', { name: 'Save Changes' });
  if (await save.isVisible().catch(() => false)) {
    await save.click();
  }

  await page.getByRole('button', { name: 'Lock squad Alpha Squad' }).click();
  await expect(page.getByRole('button', { name: 'Unlock squad Alpha Squad' })).toBeVisible({
    timeout: 20000,
  });

  await page.getByRole('button', { name: 'Add re-entry to squad Bravo Squad' }).click();
  await expect(page.getByRole('heading', { name: 'Re-enter Participants' })).toBeVisible({
    timeout: 15000,
  });
});
