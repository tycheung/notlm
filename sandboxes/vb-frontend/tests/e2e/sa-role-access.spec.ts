import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('@checklist SA role access', () => {
  test('[SA-ROLE-001] SA user hides tournament and event format nav', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.saOnlyEmail || !seed.saOnlyPassword, 'SA-only seed user missing');

    await loginAsDirector(page, seed.saOnlyEmail!, seed.saOnlyPassword!);
    await expect(page).toHaveURL(/\/director$/);

    await expect(page.getByRole('link', { name: 'Tournament Management' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Event Format' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Side Action Management' })).toBeVisible();
  });

  test('[SA-ROLE-002] SA user redirected from tournament management URL', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.saOnlyEmail || !seed.saOnlyPassword, 'SA-only seed user missing');

    await loginAsDirector(page, seed.saOnlyEmail!, seed.saOnlyPassword!);
    await page.goto('/director/tournaments');
    await expect(page).toHaveURL(/\/director$/);
  });

  test('[SA-ROLE-003] SA dashboard shows SA quick actions only', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.saOnlyEmail || !seed.saOnlyPassword, 'SA-only seed user missing');

    await loginAsDirector(page, seed.saOnlyEmail!, seed.saOnlyPassword!);
    await expect(page.getByText('Create New Tournament')).toHaveCount(0);
    await expect(page.getByText('Manage Tournaments')).toHaveCount(0);
    await expect(page.getByText('Create SA Event', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'My Active SA Events' })).toBeVisible();
  });

  test('[SA-ROLE-004] SA user can open side action management', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.saOnlyEmail || !seed.saOnlyPassword, 'SA-only seed user missing');

    await loginAsDirector(page, seed.saOnlyEmail!, seed.saOnlyPassword!);
    await page.getByRole('link', { name: 'Side Action Management' }).click();
    await expect(page).toHaveURL(/\/director\/side-actions$/);
    await expect(page.getByRole('heading', { name: 'Side Action Management' })).toBeVisible();
  });
});
