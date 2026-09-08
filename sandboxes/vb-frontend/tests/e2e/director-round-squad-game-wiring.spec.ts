import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('round details loads via with-event, summary, and with-games', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);

  const withEvent = page.waitForRequest(
    (req) =>
      req.method() === 'GET' &&
      req.url().includes(`/api/v1/rounds/${seed.roundId}/with-event`)
  );
  const summary = page.waitForRequest(
    (req) =>
      req.method() === 'GET' &&
      req.url().includes(`/api/v1/rounds/${seed.roundId}/summary`) &&
      !req.url().includes('/rounds/summary')
  );
  const withGames = page.waitForRequest(
    (req) =>
      req.method() === 'GET' &&
      req.url().includes(`/api/v1/rounds/${seed.roundId}/with-games`)
  );

  await page.goto(`/director/rounds/${seed.roundId}`);
  await withEvent;
  await summary;
  await withGames;

  await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`Event: ${seed.eventName}`)).toBeVisible();
  await expect(page.getByText('Error loading round details.')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Round Progress' })).toBeVisible();
  await expect(page.getByText('Highest Score')).toBeVisible();
  const highScore = page
    .locator('.bg-surface-light')
    .filter({ hasText: 'Highest Score' })
    .locator('.text-2xl');
  await expect(highScore).toBeVisible({ timeout: 30000 });
  await expect(highScore).not.toHaveText('0');
  const highValue = Number((await highScore.textContent())?.trim() || '0');
  expect(highValue).toBeGreaterThanOrEqual(200);

  await page.getByRole('tab', { name: 'Games' }).click();
  await expect(page.getByRole('heading', { name: 'Game #1' }).first()).toBeVisible();

  const participantsReq = page.waitForRequest(
    (req) =>
      req.method() === 'GET' &&
      req.url().includes(`/api/v1/rounds/${seed.roundId}/participants`)
  );
  await page.getByRole('tab', { name: 'Participants' }).click();
  await participantsReq;
  await expect(page.getByRole('heading', { name: 'Round Participants' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Participant 1' })).toBeVisible({
    timeout: 15_000,
  });
});

test('rounds management click-through opens round details', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.eventId}/rounds`);
  await expect(page.getByRole('heading', { name: 'Rounds & Squads Management' })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Round 1' }).click();
  await expect(page).toHaveURL(new RegExp(`/director/rounds/${seed.roundId}`));
  await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`Event: ${seed.eventName}`)).toBeVisible();
});

test('squad edit loads with-event breadcrumb and form', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);

  const squadGet = page.waitForRequest(
    (req) =>
      req.method() === 'GET' &&
      req.url().includes(`/api/v1/squads/${seed.squadId}`) &&
      !req.url().includes('/with-')
  );
  const withEvent = page.waitForRequest(
    (req) =>
      req.method() === 'GET' &&
      req.url().includes(`/api/v1/rounds/${seed.roundId}/with-event`)
  );

  await page.goto(`/director/squads/${seed.squadId}/edit`);
  await squadGet;
  await withEvent;

  await expect(page.getByRole('heading', { name: 'Edit Squad' })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('input[name="name"]')).toHaveValue(seed.squadName);
  await expect(page.getByText(seed.eventName)).toBeVisible();
});

test('game details uses with-event when squad_id is null', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);

  const frames = page.waitForRequest(
    (req) =>
      req.method() === 'GET' && req.url().includes(`/api/v1/games/${seed.gameId}/frames`)
  );
  const withEvent = page.waitForRequest(
    (req) =>
      req.method() === 'GET' &&
      req.url().includes(`/api/v1/rounds/${seed.roundId}/with-event`)
  );

  await page.goto(`/director/games/${seed.gameId}`);
  await frames;
  await withEvent;

  await expect(page.getByRole('heading', { name: 'Game #1' })).toBeVisible({ timeout: 15_000 });
  const gameUserLabel = seed.gameUserId
    ? `Bowler #${seed.gameUserId} - Round 1`
    : /Bowler #\d+ - Round 1/;
  await expect(page.getByText(gameUserLabel)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verify score' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reject score' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to Round' })).toBeVisible();
});

test('game details uses squad get when squad_id is set', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);

  const frames = page.waitForRequest(
    (req) =>
      req.method() === 'GET' &&
      req.url().includes(`/api/v1/games/${seed.gameWithSquadId}/frames`)
  );
  const squadGet = page.waitForRequest(
    (req) =>
      req.method() === 'GET' && req.url().includes(`/api/v1/squads/${seed.squadId}`)
  );

  await page.goto(`/director/games/${seed.gameWithSquadId}`);
  await frames;
  await squadGet;

  await expect(page.getByRole('heading', { name: 'Game #1' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Back to Squad' })).toBeVisible();
});

test('squads/create redirects to event details', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.eventId}/squads/create`);
  await expect(page).toHaveURL(new RegExp(`/director/events/${seed.eventId}$`));
  await expect(page.getByRole('heading', { name: seed.eventName })).toBeVisible({
    timeout: 15_000,
  });
});

test('user-layout squads/create redirects to event details', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/events/${seed.eventId}/squads/create`);
  await expect(page).toHaveURL(new RegExp(`/events/${seed.eventId}$`));
  await expect(page.getByRole('heading', { name: seed.eventName })).toBeVisible({
    timeout: 15_000,
  });
});
