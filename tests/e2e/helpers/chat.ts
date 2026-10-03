import { expect, type Page } from '@playwright/test';

/** Open the NotLM chat FAB dialog. */
export async function openChat(page: Page) {
  await page.getByTestId('notlm-fab').click();
  await expect(page.getByRole('dialog', { name: 'Assistant' })).toBeVisible();
  await expect(page.getByTestId('notlm-chat-input')).toBeVisible();
}

export async function sendUtterance(page: Page, text: string) {
  await page.getByTestId('notlm-chat-input').fill(text);
  await page.getByTestId('notlm-chat-send').click();
}

/** Answer a pending slot ask (e.g. list/contact name). */
export async function answerSlotAsk(
  page: Page,
  prompt: RegExp,
  answer: string
) {
  const dialog = page.getByRole('dialog', { name: 'Assistant' });
  await expect(dialog.getByText(prompt)).toBeVisible({ timeout: 10_000 });
  await sendUtterance(page, answer);
}

/** Dismiss a proactive next-step offer when present. */
export async function dismissProactive(page: Page) {
  const notNow = page.getByTestId('notlm-choice-__no__');
  if (await notNow.isVisible().catch(() => false)) {
    await notNow.click();
  }
}

/** Confirm a pending confirm prompt via Yes chip or typed yes. */
export async function confirmYes(page: Page) {
  const yesChip = page.getByTestId('notlm-choice-__yes__');
  await expect(yesChip).toBeVisible({ timeout: 10_000 });
  await yesChip.click();
}

/**
 * Create-list flow with required name slot.
 * Optional: dismiss proactive next-step offer with "Not now".
 */
export async function coachCreateList(
  page: Page,
  name = 'Shopping',
  opts?: { dismissProactive?: boolean }
) {
  await sendUtterance(page, 'create list');
  await answerSlotAsk(page, /name the list/i, name);
  if (opts?.dismissProactive) {
    const notNow = page.getByTestId('notlm-choice-__no__');
    if (await notNow.isVisible().catch(() => false)) {
      await notNow.click();
    }
  }
}

/** Add-contact flow with required name slot. */
export async function coachAddContact(page: Page, name = 'Alex Rivera') {
  await sendUtterance(page, 'add contact');
  await answerSlotAsk(page, /contact.?s name|contact’s name|contact's name/i, name);
}

/** Save-contact flow with confirm gate. */
export async function coachSaveContact(page: Page) {
  await sendUtterance(page, 'save contact');
  await confirmYes(page);
}
