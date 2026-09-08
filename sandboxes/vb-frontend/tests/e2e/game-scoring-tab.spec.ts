import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('game scoring tab renders without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.eventId}?tab=game_scoring`);
  await expect(page.getByRole('heading', { name: seed.eventName })).toBeVisible({
    timeout: 15000,
  });

  const text = await page.locator('body').innerText();
  expect(errors).toEqual([]);
  expect(text).toMatch(/Game Scoring Management|Morning Squad|Participant/i);
  await expect(page.getByRole('button', { name: 'Download scores CSV' })).toBeVisible();
});
