import { expect, type Locator, type Page } from '@playwright/test';

export async function openEventDetails(page: Page, eventId: string | number): Promise<void> {
  const id = String(eventId);
  const candidates = [`/director/events/${id}`, `/admin/events/${id}`, `/events/${id}`];
  for (const path of candidates) {
    await page.goto(path);
    if (!page.url().includes('/login')) {
      await expect(page).toHaveURL(new RegExp(`/events/${id}`), { timeout: 20000 });
      return;
    }
  }
  throw new Error(`Could not open event details for event ${id}`);
}

export async function openEventTab(
  page: Page,
  eventId: string | number,
  tabQuery: string
): Promise<void> {
  const id = String(eventId);
  await page.goto(`/director/events/${id}?tab=${tabQuery}`);
  await expect(page).toHaveURL(new RegExp(`/events/${id}`), { timeout: 20000 });
}

/** Open Participant Management — same flow as checklist MOD-036, then wait for roster. */
export async function openParticipantsTab(
  page: Page,
  eventId: string | number
): Promise<void> {
  await openEventTab(page, eventId, 'info');
  await expect(page.getByText('About This Event')).toBeVisible({ timeout: 20000 });
  const tab = page.getByRole('tab', { name: 'Participant Management' });
  await expect(tab).toBeVisible({ timeout: 60000 });
  await expect(tab).toBeEnabled({ timeout: 60000 });
  await tab.click();
  await expect(page.getByText(/registration status/i)).toBeVisible({ timeout: 30000 });
  await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 15000 });
  await expect(page.getByText('Loading participants...')).toHaveCount(0, { timeout: 30000 });
}

export async function openTab(page: Page, tabLabel: string): Promise<void> {
  await page.getByRole('tab', { name: tabLabel }).click();
}

export async function firstScoreInput(page: Page): Promise<Locator> {
  return page.locator('input[type="number"]').first();
}

export async function updateFirstScoreAndSave(page: Page): Promise<void> {
  const input = await firstScoreInput(page);
  await expect(input).toBeVisible({ timeout: 20000 });
  const existingRaw = await input.inputValue();
  const existing = Number(existingRaw || '0');
  const next = Number.isFinite(existing) ? existing + 1 : 200;
  await input.fill(String(next));

  const save = page.getByRole('button', { name: /save changes/i });
  await expect(save).toBeVisible({ timeout: 10000 });
  await save.click();
}

export const MATCH_PLAY_HEADING =
  /(Bracket|Double elimination|Winners bracket|Losers bracket|Grand final|Stepladder|Round robin|Pods)/i;

export const MATCH_PLAY_ERROR =
  'Match-play scoring view failed to render. Refresh the round and try again.';

export async function selectRoundContaining(page: Page, label: string): Promise<void> {
  const roundSelect = page.locator('select').filter({ hasText: label }).first();
  await expect(roundSelect).toBeVisible({ timeout: 20000 });
  const option = roundSelect.locator('option').filter({ hasText: label }).first();
  const value = await option.getAttribute('value');
  if (!value) {
    throw new Error(`No round option containing "${label}"`);
  }
  await roundSelect.selectOption(value);
}

export async function openChampionshipResults(page: Page): Promise<void> {
  await page.getByText('🥇 1st Place').click();
  await expect(page.getByRole('dialog', { name: 'Championship results' })).toBeVisible({
    timeout: 20000,
  });
}

export async function persistFirstPlayableScore(
  page: Page,
  score = '201'
): Promise<void> {
  const box = page.locator('input[aria-label*="scratch score"]:not([disabled])').first();
  await expect(box).toBeVisible({ timeout: 20000 });
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

/** Pinfall scoring uses click-to-edit cells, then a batch Save Changes bar. */
export async function prepareGameScoringForSeedRound(
  page: Page,
  eventId: number,
  roundId: number
): Promise<void> {
  await page.addInitScript(
    ({ eventId: id, roundId: rid }) => {
      window.localStorage.setItem(`vb:round-selection:event:${id}`, String(rid));
    },
    { eventId, roundId }
  );
  const eventLoaded = page.waitForResponse(
    (res) =>
      res.request().method() === 'GET' &&
      res.url().includes(`/api/v1/events/${eventId}`) &&
      res.ok()
  );
  await page.goto(`/director/events/${eventId}?tab=game_scoring`);
  await eventLoaded;

  const roundSelect = page
    .locator('select')
    .filter({ has: page.locator(`option[value="${roundId}"]`) })
    .first();
  await expect(roundSelect).toBeVisible({ timeout: 20000 });
  await roundSelect.selectOption(String(roundId));
  await expect(roundSelect).toHaveValue(String(roundId));
  await expect(page.getByText('No Locked Squads Yet')).toHaveCount(0, { timeout: 45000 });
  await expect(page.getByRole('button', { name: 'Download scores CSV' })).toBeEnabled({
    timeout: 30000,
  });
  await lockEventEntriesIfNeeded(page);
}

export async function lockEventEntriesIfNeeded(page: Page): Promise<void> {
  const lockBtn = page.getByRole('button', { name: 'Lock event entries' });
  if (!(await lockBtn.isVisible().catch(() => false))) {
    return;
  }
  if (await lockBtn.isDisabled().catch(() => true)) {
    return;
  }
  const lockResponse = page.waitForResponse(
    (res) =>
      res.request().method() === 'POST' &&
      /\/side-actions\/event\/\d+\/lock-all-entries/.test(res.url()) &&
      res.ok()
  );
  await lockBtn.click();
  const dialog = page.getByRole('dialog').filter({ hasText: /lock this event/i });
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await dialog.getByRole('button', { name: 'Lock event entries' }).click();
  await lockResponse;
  await expect(page.getByRole('button', { name: 'All entries locked' })).toBeVisible({
    timeout: 30000,
  });
}

export async function persistFirstPinfallScore(
  page: Page,
  score = '201'
): Promise<void> {
  const gameCell = page
    .locator('table')
    .first()
    .locator('tbody tr')
    .first()
    .locator('td')
    .nth(2);
  await expect(gameCell).toBeVisible({ timeout: 20000 });
  await gameCell.click();
  const input = gameCell.getByRole('textbox');
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(score);
  await input.press('Enter');
  const save = page.waitForResponse(
    (res) =>
      /\/games(\/|$)/.test(res.url()) &&
      ['PUT', 'PATCH', 'POST'].includes(res.request().method()) &&
      res.ok()
  );
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await save;
}

export async function openEventReportsMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Reports' }).click();
  await expect(page.getByRole('dialog', { name: 'Event Reports' })).toBeVisible({
    timeout: 15000,
  });
}

export async function previewNamedReport(page: Page, heading: string): Promise<void> {
  const row = page
    .locator('li')
    .filter({ has: page.getByText(heading, { exact: true }) })
    .first();
  await expect(row).toBeVisible({ timeout: 10000 });
  const configure = row.getByRole('button', { name: 'Configure' });
  if ((await configure.count()) > 0) {
    await configure.click();
    await page.getByRole('button', { name: /^Preview/ }).click();
  } else {
    await row.getByRole('button', { name: 'Preview' }).click();
  }
  await expect(page.getByRole('button', { name: 'Print / Save as PDF' })).toBeVisible({
    timeout: 45000,
  });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const back = page.getByRole('button', { name: 'Back' });
  if (await back.isVisible().catch(() => false)) {
    await back.click();
  }
}

/** Force the `<a download>` path so Playwright can observe the download event. */
export async function useAnchorDownloads(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });
}

export async function uploadHiddenCsv(page: Page, filePath: string): Promise<void> {
  await page.locator('input[type="file"][accept*="csv"]').first().setInputFiles(filePath);
}
