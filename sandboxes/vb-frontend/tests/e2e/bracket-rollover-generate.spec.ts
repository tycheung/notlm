import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { optInAlexRolloverToBrackets2 } from './helpers/bracketRollover';
import { getLiveSeed } from './helpers/liveSeed';

test('linked rollover bracket sets generate together', async ({ page }) => {
  test.setTimeout(120_000);
  const seed = getLiveSeed();
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await optInAlexRolloverToBrackets2(page, seed.eventId);

  await page.getByRole('tab', { name: 'Side Action', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Side Action', exact: true })).toBeVisible({
    timeout: 15000,
  });

  const linkedRow = page.locator('tr').filter({ hasText: /Rollover linked with/i }).first();
  await expect(linkedRow).toBeVisible({ timeout: 20000 });
  const generate = linkedRow.getByRole('button', { name: /Lock & Generate/i });
  await expect(generate).toBeVisible();

  const generateResponse = page.waitForResponse(
    (res) =>
      res.request().method() === 'POST' &&
      /\/bracket-engine\/generate/.test(res.url())
  );
  await generate.click();
  const confirm = page.getByRole('button', { name: /^(Generate|Lock|Confirm|Yes)/i }).last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirm.click();
  }
  const response = await generateResponse;
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  expect(body.bracket_count ?? 0).toBeGreaterThan(0);
});
