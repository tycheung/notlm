import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { MATCH_PLAY_ERROR, openEventTab, persistFirstPinfallScore } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('pods pinfall scoring surface persists a score', async ({ page }) => {
  const seed = getLiveSeed();
  test.skip(!seed.podsEventId, 'Pods event was not seeded');

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.podsEventId!, 'game_scoring');

  await expect(page.getByText(/Each pod bowls together/i).first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText(/Pod 1/i).first()).toBeVisible();
  await expect(page.getByText('Pod Match Board')).toHaveCount(0);
  await expect(page.getByText(MATCH_PLAY_ERROR)).toHaveCount(0);

  await persistFirstPinfallScore(page, '201');
  await page.reload();
  await openEventTab(page, seed.podsEventId!, 'game_scoring');
  await expect(
    page.locator('table').first().locator('tbody tr').first().locator('td').nth(2)
  ).toContainText('201');
});
