import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getCrudE2EEnv } from './helpers/env';
import { getLiveSeed } from './helpers/liveSeed';

test('@fullflow director can create tournament and open event create flow', async ({ page }) => {
  const env = getCrudE2EEnv();
  test.skip(!env, 'Missing CRUD E2E env (PW_E2E_TD_EMAIL, PW_E2E_TD_PASSWORD, PW_E2E_API_URL)');

  const seed = getLiveSeed();
  await loginAsDirector(page, env!.tdEmail, env!.tdPassword);
  await page.goto('/director/tournaments');

  await expect(page.getByRole('heading', { name: 'Tournament Management' })).toBeVisible({
    timeout: 30000,
  });

  const uniqueName = `E2E CRUD ${Date.now()}`;
  await page.getByRole('button', { name: 'Create Tournament' }).click();

  const dialog = page.getByRole('dialog', { name: 'Create New Tournament' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: /Tournament Name/ }).fill(uniqueName);

  await dialog.getByRole('combobox').click();
  await page.getByRole('option', { name: new RegExp(seed.centerName) }).click();

  await dialog.getByRole('button', { name: 'Create Tournament' }).click();

  // Successful create navigates into the new tournament detail page
  await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible({ timeout: 30000 });
  await expect(page).toHaveURL(/\/director\/tournaments\/\d+/);

  const createEventButton = page.getByRole('button', { name: /create event/i });
  if (await createEventButton.isVisible()) {
    await createEventButton.click();
    await expect(page.getByText(/event name|create event/i).first()).toBeVisible({
      timeout: 15000,
    });
  }
});
