/**
 * Regression checklist — all event tabs on the primary seeded event.
 * Maps to: Modules_Views (event tabs) + Side_Actions visibility
 */
import { expect, test } from '@playwright/test';

import { loginAsDirector } from '../helpers/auth';
import { openEventTab } from '../helpers/eventFlow';
import { getLiveSeed } from '../helpers/liveSeed';
import { attachPageErrorCollector } from './helpers';

test.describe('@checklist event tabs', () => {
  test.beforeEach(async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  });

  test('[MOD-035] Event Info tab', async ({ page }) => {
    const seed = getLiveSeed();
    const errors = attachPageErrorCollector(page);
    await openEventTab(page, seed.eventId, 'info');
    await expect(page.getByText('About This Event')).toBeVisible({ timeout: 15000 });
    expect(errors).toEqual([]);
  });

  test('[MOD-036] Participant Management tab', async ({ page }) => {
    const seed = getLiveSeed();
    await openEventTab(page, seed.eventId, 'info');
    await expect(page.getByText('About This Event')).toBeVisible({ timeout: 20000 });
    const tab = page.getByRole('tab', { name: 'Participant Management' });
    await expect(tab).toBeVisible({ timeout: 20000 });
    await expect(tab).toBeEnabled({ timeout: 20000 });
    await tab.click();
    await expect(page.getByText(/registration status/i)).toBeVisible({ timeout: 30000 });
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 15000 });
  });

  test('[MOD-037] Squads tab', async ({ page }) => {
    const seed = getLiveSeed();
    await openEventTab(page, seed.eventId, 'squads');
    await expect(page.getByRole('tab', { name: 'Squads' })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 15000 }
    );
    // Qualifying may be fully scored, so the workspace defaults to Finals —
    // pin the seeded round before asserting Morning Squad.
    const roundSelect = page.getByLabel('Event round');
    await expect(roundSelect).toBeVisible({ timeout: 20000 });
    await roundSelect.selectOption(String(seed.roundId));
    await expect(page.getByText(seed.squadName).first()).toBeVisible({ timeout: 30000 });
  });

  test('[MOD-038] Lane Assignments tab', async ({ page }) => {
    const seed = getLiveSeed();
    await openEventTab(page, seed.eventId, 'lane_assignment');
    await expect(page.getByRole('button', { name: 'Copy onto this round' })).toBeVisible({
      timeout: 15000,
    });
  });

  test('[MOD-039] Game Scoring tab', async ({ page }) => {
    const seed = getLiveSeed();
    const errors = attachPageErrorCollector(page);
    await openEventTab(page, seed.eventId, 'game_scoring');
    await expect(page.getByRole('button', { name: 'Download scores CSV' })).toBeVisible({
      timeout: 15000,
    });
    expect(errors).toEqual([]);
  });

  test('[MOD-040] Format Editor tab (Baker event)', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.bakerEventId, 'Baker event not seeded');
    await openEventTab(page, seed.bakerEventId!, 'format_editor');
    await expect(page.getByRole('heading', { name: 'Format Editor' })).toBeVisible({
      timeout: 15000,
    });
  });

  test('[MOD-041] Standings tab', async ({ page }) => {
    const seed = getLiveSeed();
    await openEventTab(page, seed.eventId, 'standings');
    await expect(page.getByRole('heading', { name: 'Standings' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Alex Ace')).toBeVisible({ timeout: 20000 });
  });

  test('[MOD-042] Side Action tab lists all seeded SA types', async ({ page }) => {
    const seed = getLiveSeed();
    await openEventTab(page, seed.eventId, 'side_actions');
    const pots = [
      'E2E High Game',
      'E2E High Series',
      'E2E Eliminator',
      'E2E Mystery Doubles',
      'E2E Love Doubles',
      'E2E Alibi Doubles',
      'E2E Brackets',
    ];
    for (const name of pots) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
  });
});
