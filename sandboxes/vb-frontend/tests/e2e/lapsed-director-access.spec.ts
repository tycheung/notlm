/**
 * Lapsed alumni TD: director view OK, create/write blocked by account paywall.
 */
import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('@checklist lapsed director access', () => {
  test('lapsed TD can open director dashboard but create tournament is gated', async ({
    page,
  }) => {
    const seed = getLiveSeed();
    test.skip(!seed.lapsedTdEmail || !seed.lapsedTdPassword, 'No lapsed TD in seed');

    await loginAsDirector(page, seed.lapsedTdEmail, seed.lapsedTdPassword);
    await page.goto('/director');
    await expect(page.locator('[data-guide-id="guide-assistant-fab"]')).toBeVisible({
      timeout: 20000,
    });

    await page.goto('/director/tournaments');
    const createBtn = page.getByRole('button', { name: /Create Tournament|New Tournament/i });
    if (await createBtn.count()) {
      await expect(createBtn.first()).toBeDisabled();
    } else {
      // GatedActionButton may render as link/disabled control with billing copy
      await expect(page.getByText(/subscription|pass|renew/i).first()).toBeVisible({
        timeout: 15000,
      });
    }
  });
});
