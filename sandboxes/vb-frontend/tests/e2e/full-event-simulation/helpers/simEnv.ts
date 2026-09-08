import { getCrudE2EEnv, type CrudE2EEnv } from '../../helpers/env';

export type SimEnv = CrudE2EEnv;

/** Live API + TD credentials required; skips unless PLAYWRIGHT_FULL_EVENT_SIM=1. */
export function getSimEnv(): SimEnv | null {
  if (process.env.PLAYWRIGHT_FULL_EVENT_SIM !== '1') {
    return null;
  }
  return getCrudE2EEnv();
}

export const SIM_TIMEOUT_MS = 30 * 60 * 1000;

export const SINGLES_ENTRANT_COUNT = 120;
export const TEAMS_ENTRANT_COUNT = 120;
export const TEAM_SIZE_MAX = 5;
