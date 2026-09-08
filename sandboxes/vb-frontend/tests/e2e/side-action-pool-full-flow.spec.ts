import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openParticipantsTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('side-action pools stay scoped through setup, results, and reports', async ({ page }) => {
  test.setTimeout(120_000);
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openParticipantsTab(page, seed.eventId);
  const rosterLoaded = page.waitForResponse(
    (res) =>
      res.request().method() === 'GET' &&
      res.url().includes('/side-actions/roster-signups') &&
      res.ok()
  );
  await page.getByRole('button', { name: 'Side action signups' }).click();
  await rosterLoaded;
  await expect(page.getByText('E2E High Game', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  });
  const signupSquadFilter = page.getByLabel('Filter signups by squad');
  if (await signupSquadFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
    await signupSquadFilter.selectOption({ label: 'Morning Squad' });
  }
  await expect(
    page
      .getByRole('checkbox', { name: /E2E High Game Morning Squad for Alex Ace/ })
      .first()
  ).toBeChecked({ timeout: 15000 });

  await page.getByRole('tab', { name: 'Side Action', exact: true }).click();
  const highGameRow = page
    .getByRole('row')
    .filter({ has: page.getByText('E2E High Game', { exact: true }) })
    .filter({ hasNotText: '(copy)' })
    .first();
  await expect(highGameRow).toBeVisible({ timeout: 15_000 });
  await highGameRow.getByRole('button', { name: 'View' }).click();
  await expect(page.getByRole('dialog', { name: /E2E High Game — Standings/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Alex Ace')).toBeVisible();
  await page.getByRole('button', { name: 'Close modal' }).click();

  await highGameRow.getByRole('button', { name: 'Reports' }).click();
  await expect(page.getByRole('dialog').filter({ hasText: /Reports/ }).first()).toBeVisible();
});
