import { expect, test } from '@playwright/test';

test('director tournaments route redirects unauthenticated users to login', async ({
  page,
}) => {
  await page.goto('/director/tournaments');
  await expect(page).toHaveURL(/\/login$/);
});
