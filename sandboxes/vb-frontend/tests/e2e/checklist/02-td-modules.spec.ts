/**
 * Regression checklist — TD module surfaces (dashboard, tools, tournament).
 * Maps to workbook: Modules_Views (TD) + Integration_Flows smoke
 */
import { expect, test } from '@playwright/test';

import { loginAsDirector } from '../helpers/auth';
import { getLiveSeed } from '../helpers/liveSeed';
import { expectPageLoads } from './helpers';

test.describe('@checklist TD modules', () => {
  test.beforeEach(async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  });

  test('[MOD-023] director dashboard', async ({ page }) => {
    await expectPageLoads(page, '/director', {
      heading: 'Tournament Director Dashboard',
    });
  });

  test('[MOD-024] tournament management list', async ({ page }) => {
    const seed = getLiveSeed();
    await expectPageLoads(page, '/director/tournaments', {
      heading: 'Tournament Management',
    });
    await expect(page.getByText(seed.tournamentName)).toBeVisible();
  });

  test('[MOD-028] tournament detail page', async ({ page }) => {
    const seed = getLiveSeed();
    await page.goto(`/director/tournaments/${seed.tournamentId}`);
    await expect(page.getByRole('heading', { name: seed.tournamentName })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('#tournament-events')).toBeVisible({
      timeout: 15000,
    });
  });

  test('[MOD-027] copy tournament button when events exist', async ({ page }) => {
    const seed = getLiveSeed();
    await page.goto(`/director/tournaments/${seed.tournamentId}`);
    await expect(page.locator('#tournament-events')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Copy tournament' })).toBeVisible({
      timeout: 15000,
    });
  });

  test('[MOD-034] event create page', async ({ page }) => {
    const seed = getLiveSeed();
    await page.goto(`/director/tournaments/${seed.tournamentId}/events/create`);
    await expect(page.getByRole('heading', { name: /create.*event/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('[MOD-043] event flow graph page', async ({ page }) => {
    const seed = getLiveSeed();
    await expectPageLoads(page, `/director/events/${seed.eventId}/flow`);
  });

  test('[MOD-044] house averages page', async ({ page }) => {
    await expectPageLoads(page, '/director/averages', { heading: 'House averages' });
  });

  test('[MOD-045] bowler lookup page', async ({ page }) => {
    await expectPageLoads(page, '/director/bowlers', { heading: 'Bowler lookup' });
  });

  test('[MOD-046] bowling centers page', async ({ page }) => {
    const seed = getLiveSeed();
    await expectPageLoads(page, '/director/bowling-centers', {
      heading: 'Bowling Center Management',
    });
    await expect(page.getByText(seed.centerName)).toBeVisible();
  });

  test('[MOD-047] actions needed page', async ({ page }) => {
    await expectPageLoads(page, '/director/actions-needed', { heading: 'Actions Needed' });
    await expect(page.getByText('Temporary USBC IDs')).toBeVisible();
  });

  test('[MOD-048] event format library', async ({ page }) => {
    await expectPageLoads(page, '/director/event-formats', { heading: 'Saved event formats' });
  });

  test('[MOD-049] side action templates', async ({ page }) => {
    await expectPageLoads(page, '/director/side-action-templates', {
      heading: 'Side action templates',
    });
  });

  test('[MOD-021] account page tabs', async ({ page }) => {
    await page.goto('/director/account');
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible({ timeout: 15000 });
    for (const tab of ['Profile', 'USBC IDs', 'Security', 'Notifications', 'Home Bases']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible();
    }
  });
});
