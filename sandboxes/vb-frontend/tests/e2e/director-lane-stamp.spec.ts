import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openEventReportsMenu, openEventTab, previewNamedReport } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('lane assignments can stamp game lanes', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.eventId, 'lane_assignment');
  await expect(page.getByRole('button', { name: 'Copy onto this round' })).toBeVisible({
    timeout: 15000,
  });
  const autoAssign = page.getByRole('button', { name: 'Auto assign unassigned' });
  if ((await autoAssign.count()) > 0 && (await autoAssign.isEnabled())) {
    await autoAssign.click();
  }
  await page.getByRole('button', { name: 'Stamp game lanes' }).click();
  await expect(page.getByText(/Stamped |0 games stamped/).first()).toBeVisible({
    timeout: 20000,
  });
});

test('score sheets and lane assignment reports preview', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.eventId, 'info');
  await openEventReportsMenu(page);
  await previewNamedReport(page, 'Score Sheets');
  await previewNamedReport(page, 'Lane Assignments');
});
