import { expect, test } from '@playwright/test';
import { loginAsDirector } from './helpers/auth';
import { getE2EEnv } from './helpers/env';
import {
  MATCH_PLAY_HEADING,
  openEventDetails,
  openTab,
  selectRoundContaining,
} from './helpers/eventFlow';

test('@fullflow non-eliminator parity controls render for multi-game scoring', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const env = getE2EEnv();
  test.skip(!env, 'Missing full-flow env (live seed or PW_E2E_* vars)');

  await loginAsDirector(page, env!.tdEmail, env!.tdPassword);
  await openEventDetails(page, env!.mixedEventId);
  await openTab(page, 'Game Scoring');
  await selectRoundContaining(page, 'Match Final');
  await expect(page.getByText(MATCH_PLAY_HEADING).first()).toBeVisible({ timeout: 30000 });

  const expectedByGame: Record<string, string> = { '1': '201', '2': '202', '3': '203' };
  for (const [gameIndex, score] of Object.entries(expectedByGame)) {
    const box = page.getByLabel(new RegExp(`Game ${gameIndex}, .+, scratch score`)).first();
    await expect(box).toBeVisible({ timeout: 15000 });
    const save = page.waitForResponse(
      (res) =>
        /\/games(\/|$)/.test(res.url()) &&
        ['PUT', 'PATCH', 'POST'].includes(res.request().method()) &&
        res.ok()
    );
    await box.fill(score);
    await box.blur();
    await save;
  }

  await page.reload();
  await openTab(page, 'Game Scoring');
  await selectRoundContaining(page, 'Match Final');
  await expect(page.getByText(MATCH_PLAY_HEADING).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel(/Game 3, .+, scratch score/).first()).toHaveValue('203');
});
