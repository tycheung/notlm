import { expect, test } from '@playwright/test';
import { loginAsDirector } from './helpers/auth';
import { getE2EEnv } from './helpers/env';
import { MATCH_PLAY_ERROR, MATCH_PLAY_HEADING, openEventDetails, openTab } from './helpers/eventFlow';

test('@fullflow double elimination visual labels and no error boundary', async ({ page }) => {
  const env = getE2EEnv();
  test.skip(!env, 'Missing full-flow env (live seed or PW_E2E_* vars)');
  test.skip(!env!.deEventId, 'Double-elim event was not seeded');

  await loginAsDirector(page, env!.tdEmail, env!.tdPassword);
  await openEventDetails(page, env!.deEventId);
  await openTab(page, 'Game Scoring');

  await expect(page.getByText(MATCH_PLAY_HEADING).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(MATCH_PLAY_ERROR)).toHaveCount(0);
  await expect(
    page.getByText(/Grand [Ff]inal|Losers bracket|Winners bracket|Double elimination/i).first()
  ).toBeVisible({ timeout: 45000 });
});
