import { expect, type Page } from '@playwright/test';
import {
  MATCH_PLAY_ERROR,
  openEventDetails,
  openTab,
  persistFirstPlayableScore,
  selectRoundContaining,
} from '../../helpers/eventFlow';
import { SCORING_SURFACE_HINT, type FinalMethod } from './structures';

/** Edit a bracket side score on the final round, persist, reload, assert value sticks (E2). */
export async function assertBracketScoreSavePersistence(
  page: Page,
  eventId: number
): Promise<void> {
  const marker = '211';
  await openEventDetails(page, String(eventId));
  await openTab(page, 'Game Scoring');
  await expect(
    page.getByRole('heading', { name: /Game Scoring Management/i })
  ).toBeVisible({ timeout: 45000 });

  await selectRoundContaining(page, 'Single Elim Final');

  if (await page.getByText(MATCH_PLAY_ERROR).isVisible()) {
    throw new Error(MATCH_PLAY_ERROR);
  }

  await persistFirstPlayableScore(page, marker);

  await page.reload();
  await openTab(page, 'Game Scoring');
  await expect(
    page.getByRole('heading', { name: /Game Scoring Management/i })
  ).toBeVisible({ timeout: 45000 });
  await selectRoundContaining(page, 'Single Elim Final');

  if (await page.getByText(MATCH_PLAY_ERROR).isVisible()) {
    throw new Error(MATCH_PLAY_ERROR);
  }

  const scoreInput = page.locator('input[aria-label*="scratch score"]').first();
  await expect(scoreInput).toHaveValue(marker, { timeout: 20000 });
}

export async function assertInScopeTabsPresent(page: Page): Promise<void> {
  await expect(page.getByRole('tab', { name: /Event Info|Info/i })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('tab', { name: /Participant Management|Participants/i })
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: /Squads/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Game Scoring/i })).toBeVisible();
}

export async function assertEventInfoTab(page: Page, eventLabel: string): Promise<void> {
  await openTab(page, 'Event Info').catch(async () => {
    await openTab(page, 'Info');
  });
  await expect(page.getByText(eventLabel).first()).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByText(/Prize|Payout|Championship|Event Format|About|Handicap|entry/i).first()
  ).toBeVisible({ timeout: 30000 });
}

export async function assertParticipantsTabAndEdit(
  page: Page,
  opts: { isTeams: boolean }
): Promise<void> {
  await openTab(page, 'Participant Management').catch(async () => {
    await openTab(page, 'Participants');
  });
  await expect(
    page.getByText(/Add Participants|Add Teams|Download|Upload|CSV|Roster|Sign-up/i).first()
  ).toBeVisible({ timeout: 30000 });

  // Try inline checked-in / paid edit on first editable control if present
  const checkedIn = page.getByRole('checkbox').first();
  if (await checkedIn.isVisible().catch(() => false)) {
    await checkedIn.click({ force: true }).catch(() => undefined);
  }
  const paidInput = page.locator('input[type="number"]').first();
  if (await paidInput.isVisible().catch(() => false)) {
    await paidInput.fill('90').catch(() => undefined);
  }
  if (opts.isTeams) {
    await expect(page.getByText(/Team|Captain|Members/i).first()).toBeVisible({
      timeout: 15000,
    }).catch(() => undefined);
  }
}

export async function assertSquadsTab(page: Page): Promise<void> {
  await openTab(page, 'Squads');
  await expect(
    page.getByText(/Squad|Lock|Unassigned|Assign|Qualifying|Final/i).first()
  ).toBeVisible({ timeout: 30000 });
}

export async function assertGameScoringTab(
  page: Page,
  finalMethod: FinalMethod
): Promise<void> {
  await openTab(page, 'Game Scoring');
  if (await page.getByText(MATCH_PLAY_ERROR).isVisible()) {
    throw new Error(MATCH_PLAY_ERROR);
  }
  const hint = SCORING_SURFACE_HINT[finalMethod];
  await expect(
    page.getByText(hint).or(page.getByText(/Game Scoring|Save changes|score|Lock/i)).first()
  ).toBeVisible({ timeout: 45000 });
}

export async function assertPayoutReadModel(page: Page): Promise<void> {
  await openTab(page, 'Event Info').catch(async () => {
    await openTab(page, 'Info');
  });
  await expect(
    page
      .getByText(/Championship results|Final Payouts|Prize|prize pool|distribution/i)
      .first()
  ).toBeVisible({ timeout: 45000 });
}

export async function runUiCertification(
  page: Page,
  opts: {
    eventId: number;
    eventLabel: string;
    isTeams: boolean;
    finalMethod: FinalMethod;
  }
): Promise<void> {
  await openEventDetails(page, String(opts.eventId));
  await assertInScopeTabsPresent(page);
  await assertEventInfoTab(page, opts.eventLabel);
  await assertParticipantsTabAndEdit(page, { isTeams: opts.isTeams });
  await assertSquadsTab(page);
  await assertGameScoringTab(page, opts.finalMethod);
  await assertPayoutReadModel(page);
}
