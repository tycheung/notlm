import { expect, test } from '@playwright/test';
import { loginAsDirector } from './helpers/auth';
import { getE2EEnv } from './helpers/env';
import {
  MATCH_PLAY_HEADING,
  openChampionshipResults,
  openEventDetails,
  openTab,
  selectRoundContaining,
} from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('@fullflow director flow reaches payout-pool read model', async ({ page }) => {
  const env = getE2EEnv();
  test.skip(!env, 'Missing full-flow env (live seed or PW_E2E_* vars)');
  const seed = getLiveSeed();
  const eventId = seed.payoutEventId != null ? String(seed.payoutEventId) : env!.mixedEventId;

  await loginAsDirector(page, env!.tdEmail, env!.tdPassword);
  await openEventDetails(page, eventId);

  await openTab(page, 'Game Scoring');
  const matchFinal = page.locator('select').filter({ hasText: 'Match Final' });
  if ((await matchFinal.count()) > 0) {
    await selectRoundContaining(page, 'Match Final');
    await expect(page.getByText(MATCH_PLAY_HEADING).first()).toBeVisible({ timeout: 30000 });
  }

  await openTab(page, 'Info');
  await expect(page.getByText(/(Status:|Participants:)/i).first()).toBeVisible({ timeout: 30000 });
  await openChampionshipResults(page);
  await expect(page.getByRole('button', { name: 'Recompute championship' })).toBeVisible();
  await page.getByRole('button', { name: 'Recompute championship' }).click();
  await expect(page.getByText(/Pay\d Bowler|No placements recorded yet|Champion/i).first()).toBeVisible({
    timeout: 30000,
  });
});
