import { expect, test } from '@playwright/test';

import { loginAsDirector, loginAsUser } from './helpers/auth';
import { openEventReportsMenu, openEventTab, openParticipantsTab, useAnchorDownloads } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('feat/role-dashboards exports and DYLG', () => {
  test('event reports menu offers Excel standings and scores downloads', async ({ page }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    await useAnchorDownloads(page);
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'info');
    await openEventReportsMenu(page);

    const standingsRow = page.locator('li').filter({ hasText: 'Excel — Standings' }).first();
    await expect(standingsRow).toBeVisible();
    const scoresRow = page.locator('li').filter({ hasText: 'Excel — Scores' }).first();
    await expect(scoresRow).toBeVisible();

    const standingsDownload = page.waitForEvent('download');
    await standingsRow.getByRole('button', { name: 'Download' }).click();
    const standingsFile = await standingsDownload;
    expect(standingsFile.suggestedFilename()).toMatch(/\.csv$/i);

    await expect(page.getByRole('dialog', { name: 'Event Reports' })).toBeVisible();
    const scoresDownload = page.waitForEvent('download');
    await scoresRow.getByRole('button', { name: 'Download' }).click();
    const scoresFile = await scoresDownload;
    expect(scoresFile.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test('qualifying eliminator round settings expose DYLG controls', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/events/${seed.eventId}/flow`);
    await expect(page.getByText('How to Use the Tournament Flow Diagram')).toBeVisible({
      timeout: 15000,
    });
    await page.locator('.react-flow__node').filter({ hasText: 'Qualifying' }).first().dblclick();
    const dialog = page.getByRole('dialog', { name: 'Edit round format' });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText('Drop your low game')).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: 'Enable DYLG' })).toBeVisible();
    await dialog.getByRole('checkbox', { name: 'Enable DYLG' }).check();
    await expect(dialog.getByText('Games to drop')).toBeVisible();
  });

  test('team event roster shows youth eligibility review chip for young bowler', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    test.skip(!seed.teamsEventId, 'Teams event was not seeded');

    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openParticipantsTab(page, seed.teamsEventId!);
    const teamRow = page.locator('tr', { hasText: 'E2E Team A' }).first();
    await teamRow.scrollIntoViewIfNeeded();
    await teamRow.getByRole('button', { name: 'Expand team' }).click();
    await expect(page.getByText('TeamBowler1 Bowler')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Review youth eligibility')).toBeVisible({
      timeout: 30000,
    });
  });
});

test('bowler history scores tab exports Excel CSV', async ({ page }) => {
  const seed = getLiveSeed();
  const email = seed.bowlerEmail ?? 'alex.ace@example.com';
  const password = seed.bowlerPassword ?? 'bowler-password-123';

  await useAnchorDownloads(page);
  await loginAsUser(page, email, password);
  await page.goto('/performance-tracking');
  await expect(page.getByRole('button', { name: 'Scores' })).toBeVisible({ timeout: 20000 });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel' }).first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
});
