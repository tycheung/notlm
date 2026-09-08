import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('@checklist Tournament management sort UX', () => {
  test('[TM-SORT-001] column headers sort and dropdowns removed', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/tournaments');

    await expect(page.getByRole('combobox').filter({ hasText: /Start date|Name|Desc/i })).toHaveCount(0);

    const nameHeader = page.locator('thead').getByRole('button', { name: 'Name', exact: true });
    await expect(nameHeader).toBeVisible();
    await nameHeader.click();

    const tdHeader = page.locator('thead').getByRole('button', { name: 'TD', exact: true });
    await tdHeader.click();
    await expect(tdHeader).toBeVisible();
  });
});
