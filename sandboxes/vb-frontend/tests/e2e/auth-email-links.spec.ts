/**
 * Auth email deep-link pages (reset / verify).
 * Public smoke — no live API mutation required for the happy-path render.
 */
import { expect, test } from '@playwright/test';

import { loginAsBowler } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('auth email link pages', () => {
  test('reset-password page shows form from query params', async ({ page }) => {
    await page.goto(
      '/reset-password?token=playwright-fake-token&email=bowler%40example.com'
    );
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
      'bowler@example.com'
    );
    await expect(page.getByLabel('New Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm New Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset Password' })).toBeVisible();
  });

  test('reset-password stays available while logged in', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.bowlerEmail || !seed.bowlerPassword, 'No bowler seed credentials');
    await loginAsBowler(page, seed.bowlerEmail!, seed.bowlerPassword!);
    await page.goto(
      '/reset-password?token=playwright-fake-token&email=bowler%40example.com'
    );
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.getByLabel('New Password', { exact: true })).toBeVisible();
  });

  test('reset-password without params shows recovery CTA', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText(/Invalid or missing reset token/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Request New Reset Link/i })).toBeVisible();
  });

  test('verify-email without params shows invalid message', async ({ page }) => {
    await page.goto('/verify-email');
    await expect(page.getByText(/Invalid verification link/i)).toBeVisible();
  });
});
