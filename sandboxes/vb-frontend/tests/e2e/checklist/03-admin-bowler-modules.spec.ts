/**
 * Regression checklist — Admin and Bowler module surfaces.
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin, loginAsBowler } from '../helpers/auth';
import { getLiveSeed } from '../helpers/liveSeed';
import { expectPageLoads } from './helpers';

test.describe('@checklist admin modules', () => {
  test.beforeEach(async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.adminEmail || !seed.adminPassword, 'Admin user not seeded');
    await loginAsAdmin(page, seed.adminEmail!, seed.adminPassword!);
  });

  test('[MOD-050] admin dashboard', async ({ page }) => {
    await expectPageLoads(page, '/admin', { heading: 'Admin Dashboard' });
  });

  test('[MOD-051] admin happening today schedule', async ({ page }) => {
    await page.goto('/admin/happening-today');
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page).not.toHaveURL(/\/login$/);
  });

  test('[MOD-052] user management', async ({ page }) => {
    await expectPageLoads(page, '/admin/users', { heading: 'User Management' });
  });

  test('[MOD-053] abuse reports queue', async ({ page }) => {
    await expectPageLoads(page, '/admin/abuse-reports', { heading: 'Abuse Reports' });
  });

  test('[MOD-054] grant credits + td credits', async ({ page }) => {
    await expectPageLoads(page, '/admin/grant-credits', {
      heading: 'Grant tournament credits',
    });
    await expectPageLoads(page, '/admin/td-credits', { heading: 'Active credits' });
  });

  test('[MOD-055] system settings and status', async ({ page }) => {
    await expectPageLoads(page, '/admin/system-settings', { heading: 'System Settings' });
    await expectPageLoads(page, '/admin/system-status', { heading: 'System Status' });
  });

  test('[MOD-056] view as TD', async ({ page }) => {
    await expectPageLoads(page, '/admin/view-as-td', { heading: 'Director View' });
  });
});

test.describe('@checklist bowler modules', () => {
  test.beforeEach(async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.bowlerEmail || !seed.bowlerPassword, 'Bowler user not seeded');
    await loginAsBowler(page, seed.bowlerEmail!, seed.bowlerPassword!);
  });

  test('[MOD-015] bowler dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/Welcome,/)).toBeVisible({ timeout: 15000 });
  });

  test('[MOD-016] my tournaments', async ({ page }) => {
    await page.goto('/my-tournaments');
    await expect(page.getByRole('heading', { name: /My Tournaments/i }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('[MOD-017] stats performance tracking', async ({ page }) => {
    await page.goto('/performance-tracking');
    await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible({ timeout: 15000 });
  });

  test('[MOD-018] financials performance tracking', async ({ page }) => {
    await page.goto('/performance-tracking?tab=financials');
    await expect(page.getByRole('heading', { name: 'Financials' })).toBeVisible({
      timeout: 15000,
    });
  });

  test('[MOD-022] notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page).not.toHaveURL(/\/login$/);
  });
});
