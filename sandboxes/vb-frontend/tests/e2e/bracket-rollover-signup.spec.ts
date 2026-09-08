import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { optInAlexRolloverToBrackets2 } from './helpers/bracketRollover';
import { getLiveSeed } from './helpers/liveSeed';

test('bowler leftover tickets can opt into a linked bracket set', async ({ page }) => {
  test.setTimeout(120_000);
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await optInAlexRolloverToBrackets2(page, seed.eventId);

  await page.reload();
  await page.goto(`/director/events/${seed.eventId}?tab=participants`);
  await page.getByRole('button', { name: 'Side action signups' }).click();
  const squadFilter = page.getByLabel('Filter signups by squad');
  if (await squadFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
    await squadFilter.selectOption({ label: 'Morning Squad' });
  }
  const alexRow = page.locator('tr', { hasText: /Alex Ace/i }).first();
  await alexRow
    .getByRole('button', {
      name: 'Configure bracket rollover for Alex Ace',
    })
    .click();
  await expect(page.locator('li').filter({ hasText: 'E2E Brackets 2' })).toBeVisible();
});
