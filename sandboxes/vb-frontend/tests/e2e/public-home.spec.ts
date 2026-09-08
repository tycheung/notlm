import { expect, test } from '@playwright/test';

test('home page shows product title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Victory Bowling' })).toBeVisible();
});

test('home links to login and register', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Log In' })).toHaveAttribute('href', '/login');
  await expect(page.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
});
