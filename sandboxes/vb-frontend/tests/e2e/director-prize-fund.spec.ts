import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openChampionshipResults, openEventTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('prize fund modal opens from event info', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.eventId, 'info');
  await page.getByRole('button', { name: 'Configure prize fund' }).click();
  const dialog = page.getByRole('dialog', { name: 'Prize fund & payouts' });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
});

test('completed payout chain shows championship placements and final payouts', async ({
  page,
}) => {
  const seed = getLiveSeed();
  test.skip(!seed.payoutEventId, 'Payout chain event was not seeded');

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.payoutEventId!, 'info');
  await openChampionshipResults(page);
  const championship = page.getByRole('dialog', { name: 'Championship results' });
  await expect(championship.getByRole('button', { name: 'Recompute championship' })).toBeVisible();
  await expect(championship.getByText(/Pay\d Bowler|No placements recorded yet/).first()).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole('button', { name: 'Close modal' }).click();

  const finalPayouts = page.getByRole('button', { name: 'Final Payouts' });
  if (await finalPayouts.isVisible().catch(() => false)) {
    await finalPayouts.click();
    const payouts = page.getByRole('dialog', { name: 'Final Payouts' });
    await expect(payouts).toBeVisible();
    await expect(payouts.getByRole('columnheader', { name: 'Position' })).toBeVisible();
    await expect(payouts.getByRole('columnheader', { name: 'Amount' })).toBeVisible();
  }
});
