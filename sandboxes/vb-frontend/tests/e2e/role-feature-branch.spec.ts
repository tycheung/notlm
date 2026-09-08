import { expect, test } from '@playwright/test';

import { loginAsDirector, loginAsUser } from './helpers/auth';
import { openEventTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('director profile can save an optional display name', async ({ page }) => {
  const seed = getLiveSeed();
  const displayName = `E2E Desk ${Date.now()}`;

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto('/director/account');
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Profile' }).click();

  const displayField = page.getByLabel('Display name (optional)');
  await expect(displayField).toBeVisible({ timeout: 15_000 });
  await displayField.fill(displayName);
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText(new RegExp(displayName))).toBeVisible({ timeout: 15_000 });
});

test('prize fund modal exposes lineage flat and per-game controls', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.eventId, 'info');
  await page.getByRole('button', { name: 'Configure prize fund' }).click();

  const dialog = page.getByRole('dialog', { name: 'Prize fund & payouts' });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByRole('button', { name: 'Flat total' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Per game' })).toBeVisible();

  await dialog.getByRole('button', { name: 'Per game' }).click();
  await expect(dialog.getByLabel('Lineage per game per bowler ($)')).toBeVisible({
    timeout: 10_000,
  });
  await dialog.getByRole('button', { name: 'Flat total' }).click();
  await expect(dialog.getByLabel('Lineage total ($)')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('teams event offers team-entry pots and team signup grid', async ({ page }) => {
  const seed = getLiveSeed();
  test.skip(!seed.teamsEventId, 'Teams event was not seeded');
  test.setTimeout(90_000);

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.teamsEventId}?tab=side_actions`);
  await expect(page.getByRole('heading', { name: /E2E Teams Event/i })).toBeVisible({
    timeout: 15_000,
  });

  const teamHighGame = page.getByRole('row').filter({ hasText: 'E2E Team High Game' });
  await expect(teamHighGame).toBeVisible({ timeout: 15_000 });
  await teamHighGame.getByRole('button', { name: 'View' }).click();
  await expect(page.getByRole('dialog', { name: /E2E Team High Game/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('columnheader', { name: 'Team' })).toBeVisible();
  await page.getByRole('button', { name: 'Close modal' }).click();

  await page
    .getByRole('heading', { name: 'High Games' })
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
    .getByRole('button', { name: 'Create new' })
    .click();
  const createDialog = page.getByRole('dialog').first();
  await expect(createDialog).toBeVisible({ timeout: 15_000 });
  await expect(createDialog.getByText('Who enters this pot?')).toBeVisible();
  await expect(createDialog.getByText('Team', { exact: true }).first()).toBeVisible();
  await expect(createDialog.getByText('Who can enter this pot?')).toBeVisible();
  await page.keyboard.press('Escape');

  await openEventTab(page, seed.teamsEventId!, 'participants');
  await expect(page.getByText('E2E Team A')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Side action signups' }).click();
  await expect(page.getByText('E2E Team High Game')).toBeVisible({ timeout: 15_000 });
  const groupByTeam = page.getByLabel(/Group by team/i);
  if (await groupByTeam.isVisible().catch(() => false)) {
    await groupByTeam.check();
    await expect(page.getByText('E2E Team A').first()).toBeVisible();
  }
});

test('bowler financials tab shows team side-action columns', async ({ page }) => {
  const seed = getLiveSeed();
  const email = seed.bowlerEmail ?? 'alex.ace@example.com';
  const password = seed.bowlerPassword ?? 'bowler-password-123';

  await loginAsUser(page, email, password);
  await page.goto('/performance-tracking');
  await expect(page.getByRole('button', { name: 'Financials' })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Financials' }).click();
  await expect(page.getByText('Team side action entered')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Team side action won')).toBeVisible();
});
