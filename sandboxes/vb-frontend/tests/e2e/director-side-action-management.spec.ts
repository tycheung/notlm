import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getCrudE2EEnv } from './helpers/env';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('@checklist Side Action Management', () => {
  test('[SA-001] sidebar link loads side action management page', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.getByRole('link', { name: 'Side Action Management' }).click();
    await expect(page).toHaveURL(/\/director\/side-actions$/);
    await expect(page.getByRole('heading', { name: 'Side Action Management' })).toBeVisible();
  });

  test('[SA-002] dashboard quick actions for SA events', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director');

    await page.getByText('Manage SA Events', { exact: true }).click();
    await expect(page).toHaveURL(/\/director\/side-actions$/);

    await page.goto('/director');
    await page.getByText('Create SA Event', { exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Create SA Event' })).toBeVisible();
    await expect(page.locator('#sa_game_count')).toHaveValue('3');
  });

  test('[SA-003] standard create tournament has no SA-only checkbox', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/tournaments');
    await page.getByRole('button', { name: 'Create Tournament' }).click();
    await expect(page.getByRole('dialog', { name: 'Create New Tournament' })).toBeVisible();
    await expect(page.locator('#sa_only')).toHaveCount(0);
    await expect(page.getByText('Side action only tournament')).toHaveCount(0);
  });

  test('[SA-005] TD sees SA badge on side action list names', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/side-actions');
    await expect(page.getByRole('cell', { name: /E2E TD SA Event/i })).toBeVisible();
    await expect(
      page.getByRole('row', { name: /E2E TD SA Event/i }).getByText('SA', { exact: true })
    ).toBeVisible();
  });
});

test.describe('@checklist @fullflow Side Action create and desk shell', () => {
  test('[SA-004] create SA event lands on trimmed desk', async ({ page }) => {
    const env = getCrudE2EEnv();
    test.skip(!env, 'Missing CRUD E2E env (PW_E2E_TD_EMAIL, PW_E2E_TD_PASSWORD, PW_E2E_API_URL)');

    const seed = getLiveSeed();
    await loginAsDirector(page, env!.tdEmail, env!.tdPassword);
    await page.goto('/director/side-actions');
    await page.getByRole('button', { name: 'Create SA Event' }).click();

    const dialog = page.getByRole('dialog', { name: 'Create SA Event' });
    await expect(dialog).toBeVisible();

    const uniqueName = `E2E SA ${Date.now()}`;
    await dialog.getByLabel(/Event name/i).fill(uniqueName);
    await dialog
      .getByRole('combobox')
      .filter({ hasText: /Select a bowling center/i })
      .click();
    await page.getByRole('option', { name: new RegExp(seed.centerName) }).click();

    const createResponse = page.waitForResponse(
      (res) => res.url().includes('/tournaments') && res.request().method() === 'POST'
    );
    await dialog.getByRole('button', { name: 'Create SA Event' }).click();
    expect((await createResponse).ok()).toBeTruthy();

    await expect(page).toHaveURL(/\/director\/side-actions\/events\/\d+/, { timeout: 30000 });

    await expect(page.getByRole('tab', { name: 'Participant Management' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Game Scoring' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Side Action' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Event Info' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Standings' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Lane Assignments' })).toHaveCount(0);

    await expect(page.getByText('Screen:', { exact: true })).toHaveCount(0);

    await page.getByRole('tab', { name: 'Game Scoring' }).click();
    await expect(page.getByLabel('Event round')).toHaveCount(0);
    await expect(
      page.getByText(/Pinfall on this tab is for side actions only/i)
    ).toBeVisible();

    await page.getByRole('tab', { name: 'Side Action' }).click();
    await expect(page.getByRole('tab', { name: 'Side Action' })).toHaveAttribute('aria-selected', 'true');

    await page.goto('/director/tournaments');
    await expect(page.getByRole('cell', { name: uniqueName })).toHaveCount(0);
  });
});
