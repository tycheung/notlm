import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('published live tab polls CDN JSON and never opens SSE', async ({ page }) => {
  const seed = getLiveSeed();
  const pointer = {
    event_id: seed.eventId,
    round_id: seed.roundId,
    version: 'e2e1',
    updated_at: '2026-08-19T12:00:00',
    status: 'in_progress',
  };
  const board = {
    event_id: seed.eventId,
    round_id: seed.roundId,
    version: 'e2e1',
    updated_at: '2026-08-19T12:00:00',
    round: {
      id: seed.roundId,
      round_number: 1,
      friendly_name: 'CDN Qualifying',
      status: 'in_progress',
      game_count: 1,
    },
    event_format: 'singles',
    squads: [],
  };

  await page.route('**/live/**/*.json', async (route) => {
    const url = route.request().url();
    if (url.includes('/v.json')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pointer),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(board),
    });
  });

  const streamHits: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('live-scores/stream')) {
      streamHits.push(req.url());
    }
  });

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(
    `/director/tournaments/${seed.tournamentId}?tab=live&eventId=${seed.eventId}`
  );
  await expect(page.getByRole('tab', { name: 'Rounds' })).toBeVisible({ timeout: 20000 });
  const qualifyingRound = page.getByRole('button', { name: /Qualifying/i });
  await expect(qualifyingRound).toBeVisible({ timeout: 20000 });
  await qualifyingRound.click();
  await expect(page.getByText('Scores as of')).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'CDN Qualifying' })).toBeVisible();
  expect(streamHits).toEqual([]);
});
