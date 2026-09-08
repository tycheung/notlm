import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test('event format wizard can add stages, save to library, and reopen', async ({ page }) => {
  test.setTimeout(90_000);
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await page.goto('/director/event-formats');
  await expect(page.getByRole('heading', { name: 'Saved event formats' })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: 'Event format wizard' }).click();

  const resume = page.getByRole('dialog', { name: /Resume unsaved wizard/i });
  if (await resume.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByRole('button', { name: 'Load from link (discard unsaved)' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Event format wizard' })).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole('button', { name: 'Add Stage' }).click();
  const addStage = page.getByRole('dialog', { name: 'Add Stage' });
  await expect(addStage).toBeVisible();
  await addStage.getByLabel('Name').fill('E2E Extra Round');
  await addStage.getByRole('button', { name: 'Create Stage' }).click();
  await expect(addStage).toHaveCount(0);

  await page.getByRole('button', { name: 'Add Stage' }).click();
  await expect(addStage).toBeVisible();
  await addStage.locator('select').selectOption('payout');
  await addStage.getByLabel('Name').fill('E2E Extra Payout');
  await addStage.getByRole('button', { name: 'Create Stage' }).click();
  await expect(addStage).toHaveCount(0);

  await page.getByRole('button', { name: 'Add Relationship' }).click();
  const relDialog = page.getByRole('dialog', { name: /flow arrow/i });
  await expect(relDialog).toBeVisible({ timeout: 10000 });
  await relDialog.getByRole('button', { name: 'Cancel' }).click();

  const formatName = `E2E Wizard ${Date.now()}`;
  await page.getByRole('button', { name: 'Save format to library' }).click();
  const saveDialog = page.getByRole('dialog', { name: 'Save format to library' });
  await expect(saveDialog).toBeVisible();
  await saveDialog.getByLabel('Name for this saved format').fill(formatName);
  await saveDialog.getByRole('button', { name: 'Save as new' }).click();

  await page.goto('/director/event-formats');
  await expect(page.getByText(formatName)).toBeVisible({ timeout: 15000 });
  await page.getByRole('row', { name: new RegExp(formatName) }).getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Event format wizard' })).toBeVisible({
    timeout: 15000,
  });
});
