import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('director dashboard renders for authenticated TD session', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto('/director');

  await expect(page.getByRole('heading', { name: 'Tournament Director Dashboard' })).toBeVisible({
    timeout: 15000,
  });
});
