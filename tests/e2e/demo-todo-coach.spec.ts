import { expect, test, type Page, type Request } from '@playwright/test';

test.describe('@guide-nlu @ui-actions demo-todo coach', () => {
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

  async function openChat(page: Page) {
    await page.getByTestId('uipilot-fab').click();
    await expect(page.getByRole('dialog', { name: 'Assistant' })).toBeVisible();
    await expect(page.getByTestId('uipilot-chat-input')).toBeVisible();
  }

  async function sendUtterance(page: Page, text: string) {
    await page.getByTestId('uipilot-chat-input').fill(text);
    await page.getByTestId('uipilot-chat-send').click();
  }

  test('create list (and add item) via coach chat — UI click only, no /api', async ({
    page,
  }) => {
    page.on('request', assertNoProductApi);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'demo-todo' })).toBeVisible();
    await expect(page.getByText('No lists yet')).toBeVisible();

    await openChat(page);
    await sendUtterance(page, 'create list');

    await expect(page.getByRole('listitem').filter({ hasText: 'Shopping' })).toBeVisible();

    await sendUtterance(page, 'add item');
    await expect(page.getByRole('listitem').filter({ hasText: 'Milk' })).toBeVisible();
  });

  test('command palette opens with Ctrl+K', async ({ page }) => {
    page.on('request', assertNoProductApi);

    await page.goto('/');
    await expect(page.getByTestId('uipilot-fab')).toBeVisible();
    await page.locator('body').click();
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('uipilot-command-palette')).toBeVisible();
    await expect(
      page.getByRole('dialog', { name: 'Workflow command palette' })
    ).toBeVisible();
  });
});
