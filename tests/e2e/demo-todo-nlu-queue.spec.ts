import { expect, test, type Page } from '@playwright/test';

test.describe('@guide-nlu demo-todo nlu + queue', () => {
  async function openChat(page: Page) {
    await page.getByTestId('uipilot-fab').click();
    await expect(page.getByRole('dialog', { name: 'Assistant' })).toBeVisible();
  }

  async function sendUtterance(page: Page, text: string) {
    await page.getByTestId('uipilot-chat-input').fill(text);
    await page.getByTestId('uipilot-chat-send').click();
  }

  test('unintelligible utterance offers next DAG step', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'asdf qwer zxcv');

    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/didn.?t catch that/i)).toBeVisible();
    await expect(page.getByTestId('uipilot-choice-create_list')).toBeVisible();
    await expect(page.getByText('No lists yet')).toBeVisible();

    await page.getByTestId('uipilot-choice-create_list').click();
    await expect(page.getByRole('listitem').filter({ hasText: 'Shopping' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('explain_field uses glossary', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'explain list name');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/List name is the title/i)).toBeVisible();
  });

  test('faq answers product questions from the blurb pack', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'is this app free to use');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/local demo/i)).toBeVisible();
  });

  test('base greeting faq answers hello', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'Hello, what can you do for me today?');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/UI coach|annotated workflows|what can you do/i)).toBeVisible();
  });

  test('help lists available steps', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'what can you do');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/available now/i)).toBeVisible();
    await expect(page.getByTestId('uipilot-choice-create_list')).toBeVisible();
  });

  test('entity lookup finds a list by name and flashes its row', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'create list');
    await expect(page.getByRole('listitem').filter({ hasText: 'Shopping' })).toBeVisible({
      timeout: 10_000,
    });

    await sendUtterance(page, 'show me the Shopping list');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/Found .*Shopping/i)).toBeVisible();
    await expect(page.locator('[data-guide-id^="guide-list-row-"]').first()).toBeVisible();
  });

  test('userFill fields get a coach prompt on create list', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'create list');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/fill in the highlighted field|fill in these/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-guide-id="guide-list-name"]')).toBeVisible();
  });

  test('packed queue blocks on DAG gap then injects and resumes', async ({ page }) => {
    await page.goto('/');
    await openChat(page);

    // Skip add_item in the packed request — complete_item requires it.
    await sendUtterance(page, 'create list then complete item');

    await expect(page.getByRole('listitem').filter({ hasText: 'Shopping' })).toBeVisible();

    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/blocked/i)).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText(/Add item/i)).toBeVisible();

    await sendUtterance(page, 'add item');
    await expect(page.getByRole('listitem').filter({ hasText: 'Milk' })).toBeVisible();

    // After add_item completes, queue should auto-resume complete_item.
    await expect(page.locator('li.done').filter({ hasText: 'Milk' })).toBeVisible({
      timeout: 10_000,
    });
  });
});
