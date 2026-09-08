import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('director account tabs render without Stripe', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto('/director/account');
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByText('Manage your profile, account settings, and preferences.')
  ).toBeVisible();

  for (const tab of ['Profile', 'USBC IDs', 'Security', 'Notifications', 'Home Bases']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible();
  }
});

test('pricing page shows catalog or unconfigured Stripe copy', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto('/pricing');
  await expect(
    page.getByText(/Stripe Checkout is not configured yet|Annual|Monthly|tournament (credit|pass)/i).first()
  ).toBeVisible({ timeout: 20000 });
});
