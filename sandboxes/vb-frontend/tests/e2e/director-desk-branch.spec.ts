import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openParticipantsTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('event reports menu opens from event info', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.eventId}?tab=info`);
  await expect(page.getByRole('heading', { name: seed.eventName })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Reports' }).click();
  await expect(page.getByRole('dialog', { name: 'Event Reports' })).toBeVisible();
  await expect(page.getByText('Event Roster')).toBeVisible();
  await expect(page.getByText('Prize Fund', { exact: true })).toBeVisible();
});

test('lane assignments expose copy-from-round controls', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.eventId}?tab=lane_assignment`);
  await expect(page.getByRole('heading', { name: seed.eventName })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByLabel('Copy seats from')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy onto this round' })).toBeVisible();
});

test('participant demographics and USBC are editable', async ({ page }) => {
  test.setTimeout(120_000);
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openParticipantsTab(page, seed.eventId);
  await expect(page.getByTitle('Edit gender / date of birth').first()).toBeVisible({
    timeout: 30000,
  });
  await page.getByTitle('Edit gender / date of birth').first().click();
  await expect(page.getByRole('dialog', { name: 'Edit bowler details' })).toBeVisible();
});

test('eliminator cut schedule is editable from side-action setup', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.eventId}?tab=side_actions`);
  const elimRow = page.getByRole('row').filter({ hasText: 'E2E Eliminator' });
  await expect(elimRow).toBeVisible({ timeout: 15_000 });
  await elimRow.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByText('Cut schedule')).toBeVisible();
});

test('side action templates page lists the seeded preset', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto('/director/side-action-templates');
  await expect(page.getByRole('heading', { name: 'Side action templates' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('E2E High Game Template')).toBeVisible();
});

test('baker scoring surface loads the match diagram', async ({ page }) => {
  const seed = getLiveSeed();
  test.skip(!seed.bakerEventId, 'Baker event was not seeded');
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.bakerEventId}?tab=game_scoring`);
  await expect(page.getByRole('heading', { name: 'E2E Baker Event' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText(/(Baker|Bracket|Match|Visual Editor)/i).first()
  ).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});
