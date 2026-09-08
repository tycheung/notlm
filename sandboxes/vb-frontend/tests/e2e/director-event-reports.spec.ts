import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openEventReportsMenu, openEventTab, previewNamedReport } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

const REPORTS: string[] = [
  'Standings',
  'Single Game Results',
  'Prize Fund',
  'Score Sheets',
  'Lane Assignments',
  'Event Financials',
  'Side Action Financials',
  'Event Roster',
];

test('event reports menu previews each printable report', async ({ page }) => {
  test.setTimeout(180_000);
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.eventId, 'info');
  await openEventReportsMenu(page);

  for (const heading of REPORTS) {
    await previewNamedReport(page, heading);
    await expect(page.getByRole('dialog', { name: 'Event Reports' })).toBeVisible();
  }
});
