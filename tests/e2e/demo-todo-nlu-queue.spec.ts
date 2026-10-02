import { expect, test } from '@playwright/test';
import {
  answerSlotAsk,
  coachCreateList,
  confirmYes,
  openChat,
  sendUtterance,
} from './helpers/chat';

test.describe('@guide-nlu demo-todo nlu + queue', () => {
  test('unintelligible utterance offers next DAG step', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'asdf qwer zxcv');

    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/didn.?t catch that/i)).toBeVisible();
    await expect(page.getByTestId('uipilot-choice-create_list')).toBeVisible();
    await expect(page.getByText('No lists yet')).toBeVisible();

    await page.getByTestId('uipilot-choice-create_list').click();
    await answerSlotAsk(page, /name the list/i, 'Shopping');
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
    await expect(
      dialog.locator('.uipilot-chat-bubble-assistant').filter({
        hasText: /UI coach|annotated workflows|what can you do/i,
      })
    ).toBeVisible();
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
    await coachCreateList(page, 'Shopping');
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
    await coachCreateList(page, 'Shopping');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/fill in the highlighted field|fill in these/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-guide-id="guide-list-name"]')).toBeVisible();
  });

  test('slot ask then confirm for complete_item', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await coachCreateList(page, 'Shopping');
    await sendUtterance(page, 'add item');
    await expect(page.getByRole('listitem').filter({ hasText: 'Milk' })).toBeVisible();

    await sendUtterance(page, 'complete item');
    await confirmYes(page);
    await expect(page.locator('li.done').filter({ hasText: 'Milk' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('packed queue expands prereqs and auto-advances', async ({ page }) => {
    await page.goto('/');
    await openChat(page);

    // Expands create_list → add_item → complete_item; first step uses form default name.
    await sendUtterance(page, 'create list then complete item');

    await expect(page.getByRole('listitem').filter({ hasText: 'Shopping' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('listitem').filter({ hasText: 'Milk' })).toBeVisible({
      timeout: 10_000,
    });
    // Queue auto-resume of complete_item bypasses confirm (executeStep path).
    await expect(page.locator('li.done').filter({ hasText: 'Milk' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('clear the queue drops the plan', async ({ page }) => {
    await page.goto('/');
    await openChat(page);
    await sendUtterance(page, 'create list then add item');
    await expect(page.getByRole('listitem').filter({ hasText: 'Shopping' })).toBeVisible({
      timeout: 10_000,
    });
    await sendUtterance(page, 'clear the queue');
    const dialog = page.getByRole('dialog', { name: 'Assistant' });
    await expect(dialog.getByText(/cleared the queue/i)).toBeVisible();
  });
});
