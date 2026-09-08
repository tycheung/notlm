import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('side action template edit persists a renamed template', async ({ page }) => {
  const seed = getLiveSeed();
  test.skip(!seed.saTemplateId, 'SA template was not seeded');
  const renamed = `E2E High Game Template ${Date.now()}`;

  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto('/director/side-action-templates');
  await expect(page.getByRole('heading', { name: 'Side action templates' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('E2E High Game Template')).toBeVisible();
  await page
    .getByRole('row')
    .filter({ hasText: 'E2E High Game Template' })
    .getByRole('button', { name: 'Edit' })
    .click();
  await expect(page.getByRole('heading', { name: 'Edit template' })).toBeVisible({
    timeout: 15000,
  });
  await page.getByLabel('Template name').fill(renamed);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Side action templates' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(renamed)).toBeVisible();
});
