import { expect, test } from '@playwright/test';
import { loginAsDirector } from './helpers/auth';
import { getE2EEnv } from './helpers/env';
import {
  MATCH_PLAY_ERROR,
  MATCH_PLAY_HEADING,
  openEventDetails,
  openTab,
  selectRoundContaining,
} from './helpers/eventFlow';

test('@fullflow non-eliminator visual scoring surface renders without blank fallback', async ({
  page,
}) => {
  const env = getE2EEnv();
  test.skip(!env, 'Missing full-flow env (live seed or PW_E2E_* vars)');

  await loginAsDirector(page, env!.tdEmail, env!.tdPassword);
  await openEventDetails(page, env!.mixedEventId);
  await openTab(page, 'Game Scoring');
  await selectRoundContaining(page, 'Match Final');

  await expect(page.getByText(MATCH_PLAY_HEADING).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(MATCH_PLAY_ERROR)).toHaveCount(0);
});
