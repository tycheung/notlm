import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openParticipantsTab } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('director event details page renders event title for authenticated TD', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.eventId}`);

  await expect(page.getByRole('heading', { name: seed.eventName })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('tab', { name: 'Info' })).toBeVisible();
});

test('director event details info tab shows about section', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.eventId}?tab=info`);

  await expect(page.getByRole('heading', { name: seed.eventName })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('About This Event')).toBeVisible();
  await expect(page.getByText('E2E event description for info tab smoke.')).toBeVisible();
  await expect(page.getByText('Event flow')).toBeVisible();
});

test('director event details participants tab loads roster', async ({ page }) => {
  test.setTimeout(120_000);
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openParticipantsTab(page, seed.eventId);
});

test('director event details side actions tab renders setup and seeded pots', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto(`/director/events/${seed.eventId}?tab=side_actions`);

  await expect(page.getByRole('heading', { name: seed.eventName })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('heading', { name: 'Side Action', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Director setup' })).toBeVisible();
  await expect(page.getByText('Single-elimination bracket pots')).toBeVisible();
  await expect(page.getByText('E2E High Game')).toBeVisible();
  await expect(page.getByText('E2E High Series')).toBeVisible();
  await expect(page.getByText('E2E Eliminator')).toBeVisible();
  await expect(page.getByText('E2E Mystery Doubles')).toBeVisible();
  await expect(page.getByText('E2E Love Doubles')).toBeVisible();
  await expect(page.getByText('E2E Alibi Doubles')).toBeVisible();
  await expect(page.getByText('E2E Mystery Game')).toBeVisible();
  await expect(page.getByText('E2E Brackets', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create new' })).toHaveCount(8);
});
