import { test, type Page } from '@playwright/test';
import { loginAsDirector } from '../../helpers/auth';
import {
  assertChampionshipAndPrizes,
  assertFinalComplete,
} from './assertions';
import { ApiClient } from './apiClient';
import { makeBundleConfig, provisionBundle } from './provision';
import { scoreQualifyingAndAdvance } from './scoring';
import { getSimEnv, SIM_TIMEOUT_MS } from './simEnv';
import type { FinalMethod } from './structures';
import {
  runUiCertification,
  assertBracketScoreSavePersistence,
} from './uiFlow';

export async function runFullEventSimulationBundle(
  page: Page,
  opts: {
    epicId: string;
    label: string;
    eventFormat: 'singles' | 'teams';
    finalMethod: FinalMethod;
    /** When true, also exercise Game Scoring UI save/reload (E2). */
    uiScoreSave?: boolean;
  }
): Promise<void> {
  const env = getSimEnv();
  test.skip(
    !env,
    'Set PLAYWRIGHT_FULL_EVENT_SIM=1 plus PW_E2E_TD_EMAIL / PW_E2E_TD_PASSWORD / PW_E2E_API_URL'
  );
  test.setTimeout(SIM_TIMEOUT_MS);

  const api = new ApiClient(env!);
  await api.login(env!.tdEmail, env!.tdPassword);

  const config = makeBundleConfig(
    opts.epicId,
    opts.label,
    opts.eventFormat,
    opts.finalMethod
  );
  const ctx = await provisionBundle(api, config);
  await scoreQualifyingAndAdvance(api, ctx);

  await loginAsDirector(page, env!.tdEmail, env!.tdPassword);
  await runUiCertification(page, {
    eventId: ctx.eventId,
    eventLabel: config.label,
    isTeams: opts.eventFormat === 'teams',
    finalMethod: opts.finalMethod,
  });

  if (opts.uiScoreSave) {
    await assertBracketScoreSavePersistence(page, ctx.eventId);
  }

  // Defense in depth if scoring helpers are ever split
  await assertFinalComplete(api, ctx);
  await assertChampionshipAndPrizes(api, ctx);
}
