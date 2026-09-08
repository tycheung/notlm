/**
 * Regression checklist — public pages, auth, and unauthenticated guards.
 * Run: npm run test:e2e:checklist
 * Maps to workbook sheet: Modules_Views (public/auth) + Cross_Cutting
 */
import { expect, test } from '@playwright/test';

import { loginAsBowler } from '../helpers/auth';
import { getLiveSeed } from '../helpers/liveSeed';
import { expectPageLoads } from './helpers';

test.describe('@checklist public and auth', () => {
  test('[MOD-001] login page shows email and password', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  });

  test('[MOD-005] register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create an Account' })).toBeVisible();
  });

  test('[MOD-006] forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Forgot Password' })).toBeVisible();
  });

  test('[MOD-007] home page shows Victory Bowling', async ({ page }) => {
    await expectPageLoads(page, '/', { heading: 'Victory Bowling' });
  });

  test('[MOD-008] pricing page loads', async ({ page }) => {
    await expectPageLoads(page, '/pricing', { heading: 'Tournament director pricing' });
  });

  test('[MOD-009] pricing shows center/org contact section', async ({ page }) => {
    await page.goto('/pricing');
    await expect(
      page.getByText(/Contact us about center \/ organization pricing/i)
    ).toBeVisible();
  });

  test('[MOD-010] legal pages load', async ({ page }) => {
    for (const path of ['/terms', '/privacy', '/cookies', '/refunds']) {
      await page.goto(path);
      await expect(page.locator('body')).not.toBeEmpty();
      await expect(page).not.toHaveURL(/\/login$/);
    }
  });

  test('[MOD-011] tournament list loads for signed-in bowler', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsBowler(page, seed.bowlerEmail!, seed.bowlerPassword!);
    await page.goto('/tournaments');
    await expect(page.getByRole('heading', { name: 'My Tournaments' })).toBeVisible({
      timeout: 20000,
    });
  });

  test('[PERM] director route redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/director/tournaments');
    await expect(page).toHaveURL(/\/login$/);
  });
});
