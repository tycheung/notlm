/**
 * E2E coverage for feat/participant-desk-and-advancement branch features.
 */
import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openParticipantsTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('participant desk and advancement', () => {
  test('side actions list API returns 200 when tab loads', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);

    const listResponse = page.waitForResponse(
      (res) =>
        res.request().method() === 'GET' &&
        /\/side-actions\/?(\?|$)/.test(res.url()) &&
        res.url().includes(`event_id=${seed.eventId}`)
    );
    await page.goto(`/director/events/${seed.eventId}?tab=side_actions`);
    const response = await listResponse;
    expect(response.ok(), `side-actions list failed: ${response.status()}`).toBeTruthy();

    await expect(page.getByRole('heading', { name: 'Side Action', exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('E2E Brackets', { exact: true })).toBeVisible();
  });

  test('check in all bowlers bulk action', async ({ page }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openParticipantsTab(page, seed.eventId);

    await page.getByRole('button', { name: /^Roster \(\d+\)$/ }).click();
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });

    let checkInAll = page.getByRole('button', { name: /Check in all bowlers/i });
    if (!(await checkInAll.isVisible({ timeout: 5000 }).catch(() => false))) {
      const checkedInCell = page
        .locator('table tbody tr')
        .filter({ has: page.getByText('Checked In', { exact: true }) })
        .getByText('Checked In', { exact: true })
        .first();
      await checkedInCell.click();
      await expect(page.getByText('Not Checked In', { exact: true }).first()).toBeVisible({
        timeout: 15000,
      });
    }

    checkInAll = page.getByRole('button', { name: /Check in all bowlers/i });
    await expect(checkInAll).toBeVisible({ timeout: 10000 });

    const bulkResponse = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        res.url().includes(`/events/${seed.eventId}/participants/check-in-all`) &&
        res.ok()
    );
    await checkInAll.click();
    const response = await bulkResponse;
    expect(response.ok(), `check-in-all failed: ${response.status()}`).toBeTruthy();
    await expect(checkInAll).toHaveCount(0, { timeout: 15000 });
  });

  test('female roster toggle is visible on participant row', async ({ page }) => {
    test.setTimeout(120_000);
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await openParticipantsTab(page, seed.eventId);
    await page.getByRole('button', { name: /^Roster \(\d+\)$/ }).click();
    await expect(page.getByText('Female', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('public live viewer shows rounds list tab', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/tournaments/${seed.tournamentId}?tab=live&eventId=${seed.eventId}`);

    await expect(page.getByRole('tab', { name: 'Rounds' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Rounds' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Qualifying/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: /Finals/i })).toBeVisible();
  });

  test('format wizard exposes per-squad advancement filters', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsDirector(page, getLiveSeed().tdEmail, getLiveSeed().tdPassword);
    await page.goto('/director/event-formats');
    await page.getByRole('button', { name: 'Event format wizard' }).click();

    const resume = page.getByRole('dialog', { name: /Resume unsaved wizard/i });
    if (await resume.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByRole('button', { name: 'Load from link (discard unsaved)' }).click();
    }

    await page.getByRole('button', { name: 'Add Stage' }).click();
    const addStage = page.getByRole('dialog', { name: 'Add Stage' });
    await addStage.getByLabel('Name').fill('E2E Qual');
    await addStage.getByRole('button', { name: 'Create Stage' }).click();

    await page.getByRole('button', { name: 'Add Stage' }).click();
    await addStage.getByLabel('Name').fill('E2E Final');
    await addStage.getByRole('button', { name: 'Create Stage' }).click();

    await page.getByRole('button', { name: 'Add Relationship' }).click();
    const relDialog = page.getByRole('dialog', { name: /flow arrow/i });
    await expect(relDialog).toBeVisible({ timeout: 10000 });

    await relDialog.locator('select').nth(0).selectOption({ label: 'E2E Qual' });
    await relDialog.locator('select').nth(1).selectOption({ label: 'E2E Final' });

    await expect(relDialog.getByText('Advancement filter')).toBeVisible();
    await expect(relDialog.getByRole('option', { name: 'Top N per squad', exact: true })).toHaveCount(1);
    await expect(
      relDialog.getByRole('option', { name: 'Top N per squad + at-large', exact: true })
    ).toHaveCount(1);
  });
});
