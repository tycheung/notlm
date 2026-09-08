import { expect, type Page } from '@playwright/test';

import { openParticipantsTab } from './eventFlow';

async function waitForRosterSignupSave(page: Page, scope?: ReturnType<Page['locator']>): Promise<void> {
  const save = page.waitForResponse(
    (res) =>
      res.url().includes('/roster-signups') &&
      res.request().method() === 'PUT' &&
      res.ok()
  );
  const saveButton = scope
    ? scope.getByRole('button', { name: /^Save$/i })
    : page.getByRole('button', { name: /^Save$/i });
  await saveButton.click();
  await save;
}

async function openSignupGrid(page: Page, eventId: number): Promise<void> {
  await openParticipantsTab(page, eventId);
  await expect(page.getByText('Loading participants...')).toHaveCount(0, {
    timeout: 60000,
  });
  const rosterLoaded = page.waitForResponse(
    (res) =>
      res.request().method() === 'GET' &&
      res.url().includes('/side-actions/roster-signups') &&
      res.ok()
  );
  await page.getByRole('button', { name: 'Side action signups' }).first().click();
  await rosterLoaded;
  const squadFilter = page.getByLabel('Filter signups by squad');
  if (await squadFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
    await squadFilter.selectOption({ label: 'Morning Squad' });
  }
}

export async function optInAlexRolloverToBrackets2(
  page: Page,
  eventId: number
): Promise<void> {
  await openSignupGrid(page, eventId);
  await expect(page.getByText('E2E Brackets', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('E2E Brackets 2').first()).toBeVisible();

  const alexRow = page.locator('tr', { hasText: /Alex Ace/i }).first();
  const rollButton = alexRow.getByRole('button', {
    name: 'Configure bracket rollover for Alex Ace',
  });
  await expect(rollButton).toBeVisible({ timeout: 15000 });
  await rollButton.click();
  await expect(
    page.getByText(/Unused tickets try each set in order before refunding/i)
  ).toBeVisible();

  const alreadyConfigured = await page
    .locator('li')
    .filter({ hasText: 'E2E Brackets 2' })
    .isVisible()
    .catch(() => false);

  if (!alreadyConfigured) {
    const popover = page
      .locator('div')
      .filter({ hasText: /Unused tickets try each set in order before refunding/i })
      .last();
    const addTargetSelect = popover.locator('select').filter({
      has: page.locator('option', { hasText: 'Choose bracket set…' }),
    });
    await addTargetSelect.selectOption({ label: 'E2E Brackets 2' });
    await expect(popover.locator('li').filter({ hasText: 'E2E Brackets 2' })).toBeVisible();
    await waitForRosterSignupSave(page, popover);
  } else {
    await page.keyboard.press('Escape');
  }
}
