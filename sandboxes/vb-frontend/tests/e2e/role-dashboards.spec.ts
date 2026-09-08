import { expect, test } from '@playwright/test';

import { loginAsDirector, loginAsUser } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('TD home loads via home-summary and shows owned tournament', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);

  const summary = page.waitForResponse(
    (res) =>
      res.url().includes('/directors/me/home-summary') &&
      res.request().method() === 'GET' &&
      res.ok()
  );
  await page.goto('/director');
  await summary;

  await expect(page.getByRole('heading', { name: 'Tournament Director Dashboard' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('Active Tournaments', { exact: true })).toBeVisible();
  await expect(page.getByText(seed.tournamentName).first()).toBeVisible({ timeout: 15000 });
});

test('TD house averages page loads from director nav', async ({ page }) => {
  let email = 'td@example.com';
  let password = 'password123';
  try {
    const seed = getLiveSeed();
    email = seed.tdEmail;
    password = seed.tdPassword;
  } catch {
    // Local desk-check against run_local when e2e seed is absent.
  }
  await loginAsDirector(page, email, password);
  await page.goto('/director/averages');

  await expect(page.getByRole('heading', { name: 'House averages' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(/Bowlers who have been on events you organized/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Last entering' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'TD avg' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Center avg' })).toBeVisible();
  await expect(page.getByLabel('Bowling center')).toBeVisible();
});

test('TD bowler lookup finds seeded bowler and opens history', async ({ page }) => {
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto('/director/bowlers');

  await expect(page.getByRole('heading', { name: 'Bowler lookup' })).toBeVisible({
    timeout: 15000,
  });

  const search = page.getByLabel('Name or USBC ID');
  await search.fill('Alex');
  const searchResponse = page.waitForResponse(
    (res) =>
      res.url().includes('/directors/bowlers/search') &&
      res.request().method() === 'GET' &&
      res.ok()
  );
  await page.getByRole('button', { name: 'Search' }).click();
  await searchResponse;

  await expect(page.getByRole('link', { name: /Alex Ace/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole('link', { name: /Alex Ace/i }).click();
  await expect(page.getByRole('heading', { name: /Alex Ace/i })).toBeVisible({ timeout: 15000 });
});

test('bowler home dashboard loads home-events lists', async ({ page }) => {
  const seed = getLiveSeed();
  const email = seed.bowlerEmail ?? 'alex.ace@example.com';
  const password = seed.bowlerPassword ?? 'bowler-password-123';
  await loginAsUser(page, email, password);
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: /Welcome,/i })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('In Progress')).toBeVisible();
  await expect(page.getByText('My Upcoming Tournaments')).toBeVisible();
  await expect(page.getByText('My Completed Tournaments')).toBeVisible();
});

test('admin can open Director View and start impersonation', async ({ page }) => {
  const seed = getLiveSeed();
  test.skip(!seed.adminEmail || !seed.adminPassword, 'Admin credentials missing from e2e seed');

  await loginAsUser(page, seed.adminEmail!, seed.adminPassword!);
  await page.goto('/admin/view-as-td');

  await expect(page.getByRole('heading', { name: 'Director View' })).toBeVisible({
    timeout: 15000,
  });

  const search = page.getByLabel('Search TDs');
  await search.fill('E2E');
  const searchResponse = page.waitForResponse(
    (res) =>
      res.url().includes('/directors/td-search') &&
      res.request().method() === 'GET' &&
      res.ok()
  );
  await page.getByRole('button', { name: 'Search' }).click();
  await searchResponse;

  await expect(page.getByText(/E2E Director/i).first()).toBeVisible({ timeout: 15000 });
  const impersonate = page.waitForResponse(
    (res) =>
      res.url().includes('/admin/impersonate') &&
      res.request().method() === 'POST' &&
      res.ok()
  );
  await page.getByRole('button', { name: 'View as TD' }).first().click();
  await impersonate;
  await expect(page).toHaveURL(/\/director/, { timeout: 15000 });
  await expect(page.getByText(/Viewing as/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Return to admin' })).toBeVisible();
});
