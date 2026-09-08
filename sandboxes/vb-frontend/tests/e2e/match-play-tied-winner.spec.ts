import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { MATCH_PLAY_HEADING, openEventTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('tied match shows pick-winner controls and persists a choice', async ({ page }) => {
  const seed = getLiveSeed();
  test.skip(!seed.tiedEventId, 'Tied match event was not seeded');

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.tiedEventId!, 'game_scoring');
  await expect(page.getByText(MATCH_PLAY_HEADING).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('manual-winner-panel')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('win-toggle-0').click();
  await expect(page.getByTestId('manual-winner-panel')).toHaveCount(0, { timeout: 20000 });
  await page.reload();
  await openEventTab(page, seed.tiedEventId!, 'game_scoring');
  await expect(page.getByTestId('manual-winner-panel')).toHaveCount(0);
});
