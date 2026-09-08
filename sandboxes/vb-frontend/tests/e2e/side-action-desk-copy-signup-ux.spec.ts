/**
 * E2E coverage for feat/side-action-desk-copy-signup-ux branch features.
 */
import { expect, test, type Locator } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openEventTab, openParticipantsTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

async function selectFinalsSquadInCopyDialog(dialog: Locator): Promise<void> {
  await dialog.getByLabel('Round').selectOption({ label: 'Round 2: Finals' });
  await dialog.getByLabel('Squad').selectOption({ label: 'Finals Squad' });
}

test.describe('side-action desk copy and signup UX', () => {
  test('desk scope filter appears on multi-squad events', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'side_actions');

    await expect(page.getByLabel('Filter side actions by round')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByLabel('Filter side actions by squad')).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy all \(\d+\)/i })).toBeVisible();
  });

  test('copy side action to another squad via modal', async ({ page }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'side_actions');

    const highGameRow = page.getByRole('row').filter({ hasText: 'E2E High Game' });
    await expect(highGameRow).toBeVisible({ timeout: 15000 });

    const copyButton = highGameRow.getByRole('button', { name: /^Copy/i }).first();
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    const dialog = page.getByRole('dialog', { name: 'Copy side action' });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const nameInput = dialog.getByLabel('Name');
    await expect(nameInput).toHaveValue(/E2E High Game \(copy\)/);

    await selectFinalsSquadInCopyDialog(dialog);

    const createResponse = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        /\/side-actions\/?$/.test(res.url()) &&
        res.ok()
    );
    await dialog.getByRole('button', { name: 'Copy side action' }).click();
    const response = await createResponse;
    expect(response.ok(), `copy create failed: ${response.status()}`).toBeTruthy();

    await expect(dialog).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByRole('row').filter({ hasText: /E2E High Game \(copy\)/ })).toBeVisible({
      timeout: 15000,
    });
  });

  test('copy all button clones visible pots in one bulk request', async ({ page }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openEventTab(page, seed.eventId, 'side_actions');

    const copyAll = page.getByRole('button', { name: /Copy all \(\d+\)/i });
    await expect(copyAll).toBeVisible({ timeout: 15000 });

    await copyAll.click();
    const dialog = page.getByRole('dialog', { name: 'Copy side actions' });
    await expect(dialog).toBeVisible();

    await selectFinalsSquadInCopyDialog(dialog);

    const bulkResponse = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        res.url().includes('/side-actions/copy-bulk') &&
        res.ok()
    );
    await dialog.getByRole('button', { name: /^Copy \(\d+\)$/ }).click();
    const response = await bulkResponse;
    expect(response.ok(), `bulk copy failed: ${response.status()}`).toBeTruthy();
    const payload = (await response.json()) as { created_count?: number };
    expect((payload.created_count ?? 0) > 0).toBeTruthy();
    await expect(dialog).toHaveCount(0, { timeout: 15000 });
  });

  test('roster signup grid shows qualifying average on participant rows', async ({ page }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openParticipantsTab(page, seed.eventId);
    await page.getByRole('button', { name: 'Side action signups' }).click();
    await page.getByLabel('Filter signups by squad').selectOption({ label: 'Morning Squad' });

    await expect(page.getByText(/Avg\s+180\.0/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('desk squad filter limits visible signup columns', async ({ page }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openParticipantsTab(page, seed.eventId);

    const rosterLoaded = page.waitForResponse(
      (res) =>
        res.request().method() === 'GET' &&
        res.url().includes('/side-actions/roster-signups') &&
        res.ok()
    );
    await page.getByRole('button', { name: 'Side action signups' }).click();
    await rosterLoaded;

    const signupSquadFilter = page.getByLabel('Filter signups by squad');
    const filterVisible = await signupSquadFilter
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!filterVisible) {
      test.skip(
        true,
        'Needs side-action pools on multiple squads (run after copy tests or seed multi-squad pots).'
      );
    }
    await signupSquadFilter.selectOption({ label: 'Morning Squad' });

    await expect(page.getByText('Alex Ace').first()).toBeVisible({
      timeout: 15000,
    });
    await signupSquadFilter.selectOption({ label: 'Finals Squad' });
    await expect(
      page.getByText('No bowlers are assigned to Finals Squad yet.')
    ).toBeVisible({ timeout: 10000 });
  });
});
