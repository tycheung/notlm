import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('director bowling-centers page renders for authenticated TD', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto('/director/bowling-centers');

  await expect(page.getByRole('heading', { name: 'Bowling Center Management' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(seed.centerName)).toBeVisible();
});
