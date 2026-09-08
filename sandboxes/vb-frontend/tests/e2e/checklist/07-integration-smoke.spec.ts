/**
 * Regression checklist — integration flow smoke entries (page-load / critical path).
 * Full behavioral QA remains manual per SESSION_HANDOFF § A1–A21.
 */
import { expect, test } from '@playwright/test';

import { loginAsBowler, loginAsDirector } from '../helpers/auth';
import { openEventTab, persistFirstPinfallScore, prepareGameScoringForSeedRound } from '../helpers/eventFlow';
import { getLiveSeed } from '../helpers/liveSeed';

test.describe('@checklist integration flows', () => {
  test('[FLOW-A21] copy tournament modal opens', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/tournaments/${seed.tournamentId}`);
    await expect(page.locator('#tournament-events')).toBeVisible({ timeout: 15000 });
    const copyBtn = page.getByRole('button', { name: 'Copy tournament' });
    await expect(copyBtn).toBeVisible({ timeout: 15000 });
    await copyBtn.click();
    await expect(page.getByRole('dialog', { name: 'Copy tournament' })).toBeVisible();
    await expect(page.getByLabel('Tournament name')).toHaveValue(/Copy of/);
  });

  test('[FLOW-A18] pricing contact form fields present', async ({ page }) => {
    await page.goto('/pricing');
    await page.getByRole('button', { name: 'Contact us' }).click();
    await expect(page.getByLabel(/organization name/i)).toBeVisible();
    await expect(page.getByLabel(/organization type/i)).toBeVisible();
  });

  test('[FLOW-A01] team standings show bowler on main event', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'standings');
    await expect(page.getByText('Alex Ace')).toBeVisible({ timeout: 20000 });
  });

  test('[FLOW-A03] game scoring accepts a pinfall edit on main event', async ({ page }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await prepareGameScoringForSeedRound(page, seed.eventId, seed.roundId);
    await persistFirstPinfallScore(page, '187');
    await expect(page.getByRole('button', { name: 'Download scores CSV' })).toBeEnabled();
  });

  test('[FLOW-A09] teams event side action tab loads', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.teamsEventId, 'Teams event not seeded');
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.teamsEventId!, 'side_actions');
    await expect(page.getByRole('heading', { name: 'Side Action', exact: true })).toBeVisible();
  });

  test('[FLOW-A15] love doubles visible on main event SA tab', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'side_actions');
    await expect(page.getByText('E2E Love Doubles', { exact: true })).toBeVisible();
  });

  test('[FLOW-A16] bowler financials page loads for seeded bowler', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.bowlerEmail || !seed.bowlerPassword, 'Bowler not seeded');
    await loginAsBowler(page, seed.bowlerEmail!, seed.bowlerPassword!);
    await page.goto('/performance-tracking?tab=financials');
    await expect(page.getByText('Financials').first()).toBeVisible({ timeout: 15000 });
  });
});
