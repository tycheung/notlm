import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import {
  MATCH_PLAY_ERROR,
  MATCH_PLAY_HEADING,
  openEventTab,
  persistFirstPlayableScore,
} from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

const METHODS = [
  { key: 'stepladderEventId' as const, heading: /Stepladder/i, name: 'stepladder' },
  { key: 'rrEventId' as const, heading: /Round robin/i, name: 'round robin' },
];

for (const method of METHODS) {
  test(`${method.name} scoring surface renders and persists a score`, async ({ page }) => {
    const seed = getLiveSeed();
    const eventId = seed[method.key];
    test.skip(!eventId, `${method.name} event was not seeded`);

    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, eventId!, 'game_scoring');
    await expect(page.getByText(MATCH_PLAY_HEADING).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(method.heading).first()).toBeVisible();
    await expect(page.getByText(MATCH_PLAY_ERROR)).toHaveCount(0);
    await persistFirstPlayableScore(page, '201');
    await page.reload();
    await openEventTab(page, eventId!, 'game_scoring');
    await expect(
      page.locator('input[aria-label*="scratch score"]:not([disabled])').first()
    ).toHaveValue('201');
  });
}
