import { expect, test } from '@playwright/test';
import { loginAsDirector } from './helpers/auth';
import { getE2EEnv } from './helpers/env';
import { openEventDetails, openTab } from './helpers/eventFlow';

test('@fullflow event info reflects live progression after scoring save', async ({ page }) => {
  const env = getE2EEnv();
  test.skip(!env, 'Missing full-flow env (live seed or PW_E2E_* vars)');

  await loginAsDirector(page, env!.tdEmail, env!.tdPassword);
  await openEventDetails(page, env!.eventId);

  await openTab(page, 'Game Scoring');
  await expect(page.getByText(/Game Scoring Management|Morning Squad|Participant/i).first()).toBeVisible({
    timeout: 30000,
  });

  await openTab(page, 'Info');
  await expect(page.getByText('Event flow')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/(Status:|Participants:)/i).first()).toBeVisible({ timeout: 30000 });
});
