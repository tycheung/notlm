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

test('@fullflow mixed-format event shows method-specific scoring context', async ({ page }) => {
  const env = getE2EEnv();
  test.skip(!env, 'Missing full-flow env (live seed or PW_E2E_* vars)');

  await loginAsDirector(page, env!.tdEmail, env!.tdPassword);
  await openEventDetails(page, env!.mixedEventId);

  await openTab(page, 'Game Scoring');
  await selectRoundContaining(page, 'Match Final');
  await expect(page.getByText(MATCH_PLAY_HEADING).first()).toBeVisible({ timeout: 30000 });

  await openTab(page, 'Info');
  await openChampionshipResults(page);
});
