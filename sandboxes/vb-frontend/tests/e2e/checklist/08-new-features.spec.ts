/**
 * Regression checklist — new feature-branch surfaces (copy, SA-only, doubles, share poster, abuse).
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin, loginAsDirector } from '../helpers/auth';
import { openEventTab } from '../helpers/eventFlow';
import { getLiveSeed } from '../helpers/liveSeed';
import { attachPageErrorCollector } from './helpers';

test.describe('@checklist new features', () => {
  test('[FLOW-A21b] copy tournament submits and navigates', async ({ page }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/tournaments/${seed.tournamentId}`);
    await expect(page.locator('#tournament-events')).toBeVisible({ timeout: 15000 });

    const copyName = `E2E Copy ${Date.now()}`;
    await page.getByRole('button', { name: 'Copy tournament' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Copy tournament' })).toBeVisible();
    await page.getByLabel('Tournament name').fill(copyName);

    const copyResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/tournaments/') &&
        res.url().includes('/copy') &&
        res.request().method() === 'POST'
    );
    await page
      .getByRole('dialog', { name: 'Copy tournament' })
      .getByRole('button', { name: 'Copy tournament' })
      .click();
    const response = await copyResponse;
    expect(response.ok(), `Copy failed: ${response.status()} ${await response.text()}`).toBeTruthy();

    await expect(page).toHaveURL(/\/director\/events\/\d+/, { timeout: 30000 });

    await page.goto('/director/tournaments');
    await expect(page.getByText(copyName)).toBeVisible({ timeout: 15000 });
  });


  test('[MOD-034b] SA-only create moved to Side Action Management', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/side-actions');
    await page.getByRole('button', { name: 'Create SA Event' }).click();
    await expect(page.getByRole('dialog', { name: 'Create SA Event' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('#sa_game_count')).toBeVisible();
    await expect(page.locator('#sa_event_format')).toBeVisible();
    await expect(page.locator('#sa_only')).toHaveCount(0);
  });

  test('[FLOW-A15b] love doubles standings modal opens', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'side_actions');
    await expect(page.getByText('E2E Love Doubles', { exact: true })).toBeVisible();

    const loveRow = page.locator('tr').filter({ hasText: 'E2E Love Doubles' });
    await loveRow.getByRole('button', { name: 'Standings' }).click();
    await expect(page.getByRole('dialog').filter({ hasText: /Love Doubles/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('[FLOW-A17] alibi doubles visible on main event SA tab', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'side_actions');
    await expect(page.getByText('E2E Alibi Doubles', { exact: true })).toBeVisible();
  });

  test('[RPT-008] event share modal opens standings QR poster preview', async ({ page }) => {
    const seed = getLiveSeed();
    const errors = attachPageErrorCollector(page);
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'info');
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page.getByRole('dialog', { name: 'Share tournament' })).toBeVisible();
    await page.getByRole('button', { name: 'Print standings poster' }).click();
    await expect(page.getByRole('dialog').filter({ hasText: /Standings QR poster/i })).toBeVisible({
      timeout: 15000,
    });
    expect(errors).toEqual([]);
  });

  test('[MOD-053b] admin abuse reports defaults to needs review queue', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.adminEmail || !seed.adminPassword, 'Admin user not seeded');
    await loginAsAdmin(page, seed.adminEmail!, seed.adminPassword!);
    await page.goto('/admin/abuse-reports');
    await expect(page.getByRole('heading', { name: 'Abuse Reports' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('combobox')).toHaveValue('needs_review');
  });
});
