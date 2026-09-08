import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('director actions-needed page renders for authenticated TD', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto('/director/actions-needed');

  await expect(page.getByRole('heading', { name: 'Actions Needed' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('Temporary USBC IDs')).toBeVisible();
  await expect(page.getByText('V000001')).toBeVisible();
});
