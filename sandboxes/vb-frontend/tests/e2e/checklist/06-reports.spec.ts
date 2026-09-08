/**
 * Regression checklist — event reports PDF previews + Excel exports.
 * Maps to workbook sheets: Reports + Integration FLOW-A04/A11/A14
 */
import { expect, test } from '@playwright/test';

import { loginAsDirector } from '../helpers/auth';
import {
  openEventReportsMenu,
  openEventTab,
  previewNamedReport,
  useAnchorDownloads,
} from '../helpers/eventFlow';
import { getLiveSeed } from '../helpers/liveSeed';

const CORE_REPORTS = [
  'Standings',
  'Single Game Results',
  'Prize Fund',
  'Score Sheets',
  'Lane Assignments',
  'Event Financials',
  'Side Action Financials',
  'Event Roster',
] as const;

test.describe('@checklist reports', () => {
  test('[FLOW-A04] event reports menu previews core PDFs', async ({ page }) => {
    test.setTimeout(240_000);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'info');
    await openEventReportsMenu(page);

    for (const heading of CORE_REPORTS) {
      await previewNamedReport(page, heading);
      await expect(page.getByRole('dialog', { name: 'Event Reports' })).toBeVisible();
    }
  });

  test('[RPT-006] lane pair conflicts report preview', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'info');
    await openEventReportsMenu(page);
    await previewNamedReport(page, 'Lane Pair Conflicts');
  });

  test('[RPT-007] stepladder diagram when stepladder event exists', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.stepladderEventId, 'Stepladder event not seeded');
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.stepladderEventId!, 'info');
    await openEventReportsMenu(page);
    const stepladderRow = page.getByText('Stepladder', { exact: true });
    if ((await stepladderRow.count()) === 0) {
      test.skip(true, 'No stepladder round on seeded stepladder event');
    }
    await previewNamedReport(page, 'Stepladder');
  });

  test('[FLOW-A11] Excel standings and scores download buttons work', async ({ page }) => {
    test.setTimeout(120_000);
    await useAnchorDownloads(page);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'info');
    await openEventReportsMenu(page);

    const standingsDl = page.waitForEvent('download', { timeout: 60000 });
    await page.getByRole('button', { name: 'Download', exact: true }).first().click();
    const standingsFile = await standingsDl;
    expect(standingsFile.suggestedFilename()).toMatch(/\.csv$/i);

    const scoresDl = page.waitForEvent('download', { timeout: 60000 });
    await page
      .locator('li')
      .filter({ has: page.getByText('Excel — Scores', { exact: true }) })
      .getByRole('button', { name: 'Download' })
      .click();
    const scoresFile = await scoresDl;
    expect(scoresFile.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test('[MOD-041] standings tab export excel', async ({ page }) => {
    await useAnchorDownloads(page);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'standings');
    const dl = page.waitForEvent('download', { timeout: 60000 });
    await page.getByRole('button', { name: /export excel/i }).click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/\.csv$/i);
  });
});
