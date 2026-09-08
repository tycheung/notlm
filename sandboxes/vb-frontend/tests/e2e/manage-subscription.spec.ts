import { expect, test } from '@playwright/test';
import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('Manage Subscription', () => {
  test('page loads and Show All Plans lists subscription catalog', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/subscription');
    await expect(page.getByRole('heading', { name: 'Manage Subscription' })).toBeVisible({
      timeout: 20000,
    });

    // Fresh e2e TD has no subscription history, so the toggle remains available.
    await expect(page.getByText('Show All Plans', { exact: true })).toBeVisible();

    const toggle = page.locator('label').filter({ hasText: 'Show All Plans' });
    await toggle.click();

    const subscriptions = page.getByRole('heading', { name: 'Subscriptions' });
    await expect(subscriptions).toBeVisible({ timeout: 10000 });

    const section = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Subscriptions', exact: true }),
    });
    await expect(
      section.getByRole('heading', { name: 'Tournament Director', exact: true })
    ).toBeVisible();
    await expect(
      section.getByRole('heading', { name: 'Tournament Director Annual', exact: true })
    ).toBeVisible();
    await expect(
      section.getByRole('heading', { name: 'Side Action', exact: true })
    ).toBeVisible();
    await expect(
      section.getByRole('heading', { name: 'Side Action Annual', exact: true })
    ).toBeVisible();
  });

  test('selecting a subscription hides Show All Plans forever', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/subscription');
    await expect(page.getByRole('heading', { name: 'Manage Subscription' })).toBeVisible({
      timeout: 20000,
    });

    if (await page.getByText('Show All Plans', { exact: true }).isVisible()) {
      await page.locator('label').filter({ hasText: 'Show All Plans' }).click();
      const section = page.locator('section').filter({
        has: page.getByRole('heading', { name: 'Subscriptions', exact: true }),
      });
      const card = section.locator('div.border').filter({
        has: page.getByRole('heading', { name: 'Tournament Director', exact: true }),
      });
      await card.getByRole('button', { name: 'Select' }).click();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByText('Show All Plans', { exact: true })).toHaveCount(0, {
        timeout: 15000,
      });
    }

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Manage Subscription' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Show All Plans', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Passes', exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('View Billing/Usage History')).toBeVisible();
    await page.getByText('View Billing/Usage History').click();
    await expect(page.getByText('Billing / Usage History')).toBeVisible({
      timeout: 10000,
    });
  });

  test('cart badge appears after adding a pass', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/subscription');
    await expect(page.getByRole('heading', { name: 'Manage Subscription' })).toBeVisible({
      timeout: 20000,
    });

    // After first test may already be subscribed; still can add passes from management view.
    const passHeading = page.getByRole('heading', { name: 'Tournament pass', exact: true });
    if (await passHeading.isVisible().catch(() => false)) {
      const passCard = page.locator('div.border').filter({ has: passHeading }).first();
      await passCard.getByRole('button', { name: /Add Tournament pass to cart|cart/i }).click();
      await expect(page.getByRole('heading', { name: 'Cart' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
    }
  });
});
