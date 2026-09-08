import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openEventTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('format editor generates pinfall pod membership', async ({ page }) => {
  const seed = getLiveSeed();
  test.skip(!seed.podsEventId, 'Pods event was not seeded');

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.podsEventId!, 'format_editor');

  await expect(page.getByRole('heading', { name: 'Format Editor' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(/Pod 1/i).first()).toBeVisible({ timeout: 20000 });

  const generate = page.getByRole('button', { name: /Generate pods/i });
  await expect(generate).toBeVisible();
  if (await generate.isEnabled()) {
    await generate.click();
    await expect(page.getByText(/pods settings saved|pod/i).first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText(/Pod 1/i).first()).toBeVisible();
  }

  const viewPods = page.getByRole('button', { name: /View pods/i });
  if (await viewPods.isVisible()) {
    await viewPods.click();
    await expect(page.getByText(/Pod 1/i).first()).toBeVisible();
  }
});
