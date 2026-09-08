import { expect, test, type Request } from '@playwright/test';
import {
  coachAddContact,
  coachSaveContact,
  openChat,
} from './helpers/chat';

test.describe('@guide-nlu @ui-actions @chrome demo-crm coach', () => {
  function assertNoProductApi(request: Request) {
    const url = request.url();
    let pathname = url;
    try {
      pathname = new URL(url).pathname;
    } catch {
      /* keep raw */
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      throw new Error(`Unexpected product API request: ${url}`);
    }
  }

  test('add + save contact via coach — UI click only, branded accent', async ({ page }) => {
    page.on('request', assertNoProductApi);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'demo-crm' })).toBeVisible();
    await expect(page.getByText('No contacts yet')).toBeVisible();

    const fab = page.getByTestId('uipilot-fab');
    await expect(fab).toBeVisible();
    await expect(fab).toHaveCSS('background-color', 'rgb(180, 83, 9)');

    await openChat(page);
    await coachAddContact(page, 'Alex Rivera');
    await expect(page.getByLabel('Contact name')).toBeVisible();

    await coachSaveContact(page);
    await expect(page.getByRole('listitem').filter({ hasText: 'Alex Rivera' })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'alex@example.com' })).toBeVisible();
  });

  test('command palette opens with Ctrl+K', async ({ page }) => {
    page.on('request', assertNoProductApi);
    await page.goto('/');
    await page.locator('body').click();
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('uipilot-command-palette')).toBeVisible();
  });
});
