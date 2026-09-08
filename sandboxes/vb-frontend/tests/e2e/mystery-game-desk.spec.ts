import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openEventTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

const apiUrl = process.env.PW_E2E_API_URL ?? 'http://127.0.0.1:8000';

test.describe('mystery game desk', () => {
  test('spin resolves when scores are complete', async ({ page }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    expect(seed.mysteryGameSideActionId, 'seed must expose mysteryGameSideActionId').toBeTruthy();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token, 'login must persist auth token').toBeTruthy();

    const spin = await page.request.post(
      `${apiUrl}/api/v1/side-actions/${seed.mysteryGameSideActionId}/mystery-game/spin`,
      {
        data: { rng_seed: 42 },
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    expect(spin.ok(), await spin.text()).toBeTruthy();
    const body = await spin.json();
    expect(body.spun).toBe(true);
    expect(body.pools?.[0]?.outcome).toMatch(/exact_match|closest|needs_respin/);
    expect(body.pools?.[0]?.target_score).toBeGreaterThan(0);

    await openEventTab(page, seed.eventId, 'side_actions');
    const mgRow = page.getByRole('row').filter({ hasText: 'E2E Mystery Game' });
    await expect(mgRow).toBeVisible({ timeout: 15000 });
    await mgRow.scrollIntoViewIfNeeded();
    await mgRow.getByRole('button', { name: 'Results' }).click();
    await expect(page.getByText('Mystery Number', { exact: true })).toBeVisible({
      timeout: 20000,
    });
  });

  test('entry summary report preview opens', async ({ page }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'side_actions');

    const mgRow = page.getByRole('row').filter({ hasText: 'E2E Mystery Game' });
    await expect(mgRow).toBeVisible({ timeout: 15000 });
    await mgRow.getByRole('button', { name: 'Reports' }).click();

    const reportsDialog = page.getByRole('dialog').filter({ hasText: /Reports/i }).first();
    await expect(reportsDialog).toBeVisible();
    const configure = reportsDialog.getByRole('button', { name: 'Configure…' }).first();
    if (await configure.isVisible()) {
      await configure.click();
    }
    const preview = page.getByRole('button', { name: 'Preview' });
    if (await preview.isVisible()) {
      await preview.click();
      await expect(page.locator('iframe').first()).toBeVisible({ timeout: 15000 });
    }
  });
});
