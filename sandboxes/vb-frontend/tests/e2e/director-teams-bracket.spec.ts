import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { MATCH_PLAY_HEADING, openEventTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('team event squads and scoring show team member inputs', async ({ page }) => {
  const seed = getLiveSeed();
  test.skip(!seed.teamsEventId, 'Teams event was not seeded');

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openEventTab(page, seed.teamsEventId!, 'squads');
  await expect(page.getByText('E2E Team A')).toBeVisible({ timeout: 15000 });

  await openEventTab(page, seed.teamsEventId!, 'game_scoring');
  await expect(page.getByText(MATCH_PLAY_HEADING).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel(/Team member .+, game 1/).first()).toBeVisible({
    timeout: 20000,
  });
});
