import { expect, test, type Page, type Request } from '@playwright/test';

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

  async function openChat(page: Page) {
    await page.getByTestId('uipilot-fab').click();
    await expect(page.getByRole('dialog', { name: 'Assistant' })).toBeVisible();
  }

  async function sendUtterance(page: Page, text: string) {
    await page.getByTestId('uipilot-chat-input').fill(text);
    await page.getByTestId('uipilot-chat-send').click();
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
    await sendUtterance(page, 'add contact');
    await expect(page.getByLabel('Contact name')).toBeVisible();

    await sendUtterance(page, 'save contact');
    await expect(page.getByText('Alex Rivera')).toBeVisible();
    await expect(page.getByText('alex@example.com')).toBeVisible();
  });

  test('command palette opens with Ctrl+K', async ({ page }) => {
    page.on('request', assertNoProductApi);
    await page.goto('/');
    await page.locator('body').click();
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('uipilot-command-palette')).toBeVisible();
  });
});
