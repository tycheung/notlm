/**
 * Admin User Management — Subscription section in create / edit modals.
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('Admin user subscription section', () => {
  test.beforeEach(async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.adminEmail || !seed.adminPassword, 'Admin user not seeded');
    await loginAsAdmin(page, seed.adminEmail!, seed.adminPassword!);
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible({
      timeout: 20000,
    });
  });

  test('create modal: Mode switches Days vs Period end; pass +/- and Include work', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Add New User' }).click();
    await expect(page.getByRole('heading', { name: 'Create New User' })).toBeVisible();

    const section = page.getByTestId('admin-subscription-section');
    await expect(section).toBeVisible();

    const mode = section.getByTestId('admin-subscription-mode');
    await expect(mode).toBeEnabled();
    await expect(section.getByTestId('admin-subscription-days')).toBeVisible();

    await mode.selectOption('date');
    await expect(section.getByTestId('admin-subscription-period-end')).toBeVisible();
    await expect(section.getByTestId('admin-subscription-days')).toHaveCount(0);

    await mode.selectOption('days');
    await expect(section.getByTestId('admin-subscription-days')).toBeVisible();

    const passCount = section.getByTestId('admin-subscription-pass-count-tournament');
    await expect(passCount).toHaveText('0');
    await section.getByTestId('admin-subscription-pass-inc-tournament').click();
    await expect(passCount).toHaveText('1');
    await section.getByTestId('admin-subscription-pass-dec-tournament').click();
    await expect(passCount).toHaveText('0');

    await section.getByTestId('admin-subscription-plan').selectOption('monthly');
    await section.getByTestId('admin-subscription-days').fill('45');
    await section.getByTestId('admin-subscription-apply').click();
    await expect(section.getByText(/will grant 45 days on create/i)).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('edit modal: subscription controls are interactive', async ({ page }) => {
    // Open first editable user row (Edit button in table).
    const editButton = page.getByRole('button', { name: /^Edit$/i }).first();
    await expect(editButton).toBeVisible({ timeout: 15000 });
    await editButton.click();

    await expect(page.getByRole('heading', { name: /Edit User/i })).toBeVisible({
      timeout: 15000,
    });

    const section = page.getByTestId('admin-subscription-section');
    await expect(section).toBeVisible();

    const mode = section.getByTestId('admin-subscription-mode');
    await expect(mode).toBeEnabled();
    await mode.selectOption('date');
    await expect(section.getByTestId('admin-subscription-period-end')).toBeVisible();
    await mode.selectOption('days');
    await expect(section.getByTestId('admin-subscription-days')).toBeVisible();

    await expect(section.getByTestId('admin-subscription-plan')).toBeEnabled();
    await expect(section.getByTestId('admin-subscription-apply')).toBeEnabled();
    await expect(section.getByTestId('admin-subscription-pass-inc-tournament')).toBeEnabled();

    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});
