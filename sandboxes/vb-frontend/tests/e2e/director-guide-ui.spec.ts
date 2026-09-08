import { expect, test, type Page } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

async function openAssistant(page: Page) {
  const fab = page.locator('[data-guide-id="guide-assistant-fab"]');
  await expect(fab).toBeVisible({ timeout: 20000 });
  const open = await fab.getAttribute('data-assistant-open');
  if (open !== 'true') {
    await fab.click();
  }
  const dialog = page.getByRole('dialog', { name: /^Assistant$/i });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function closeAssistant(page: Page) {
  const fab = page.locator('[data-guide-id="guide-assistant-fab"]');
  if ((await fab.getAttribute('data-assistant-open')) === 'true') {
    await page.getByRole('dialog', { name: /^Assistant$/i }).getByRole('button', { name: /Close/i }).click();
    await expect(fab).toHaveAttribute('data-assistant-open', 'false');
  }
}

async function sendChat(page: Page, text: string) {
  const dialog = page.getByRole('dialog', { name: /^Assistant$/i });
  const input = dialog.getByLabel('Assistant chat input');
  await input.fill(text);
  await input.press('Enter');
}

function assistantChat(page: Page) {
  return page.getByRole('dialog', { name: /^Assistant$/i });
}

/** Open Ctrl/Cmd+K palette without Chrome stealing Ctrl+K for the omnibox. */
async function openPalette(page: Page) {
  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true })
    );
  });
  const palette = page.getByRole('dialog', { name: 'Director command palette' });
  await expect(palette).toBeVisible({ timeout: 10000 });
  return palette;
}

/**
 * Live UI: chat-only assistant FAB + command palette + multipack / glossary / lookup.
 */
test.describe('@guide-nlu @checklist director guide UI', () => {
  test('brain FAB opens chat-only panel; noisy NL create tournament', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director');

    const fab = page.locator('[data-guide-id="guide-assistant-fab"]');
    await expect(fab).toBeVisible({ timeout: 20000 });
    await expect(fab).toHaveAttribute('data-assistant-open', 'false');
    await expect(page.getByText(/^Guide$/)).toHaveCount(0);
    await expect(page.getByText(/Hide guide/i)).toHaveCount(0);

    const dialog = await openAssistant(page);
    await expect(fab).toHaveAttribute('data-assistant-open', 'true');
    await expect(dialog.getByText('Assistant')).toBeVisible();
    await expect(dialog.getByText('Slightly Autistic Assistant')).toHaveCount(0);
    await expect(dialog.getByText('Checklist')).toHaveCount(0);
    await expect(dialog.getByText(/Take me there:/i)).toHaveCount(0);
    await expect(dialog.getByText(/Scoring blockers/i)).toHaveCount(0);
    await expect(dialog.getByText(/Parallel setup/i)).toHaveCount(0);

    await sendChat(page, 'creat a tornament');

    await expect(
      dialog.getByText(/Taking you to|Got it|tournament name|Create Tournament|Queued|Opening/i).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/director\/(tournaments)?/, { timeout: 15000 });
  });

  test('Ctrl+K palette jumps to Participants via friendly name', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/events/${seed.eventId}`);

    const palette = await openPalette(page);
    await palette.getByLabel('Search director steps').fill('Register part');
    await expect(palette.getByRole('option', { name: /Register participants/i })).toBeVisible();
    await palette.getByRole('option', { name: /Register participants/i }).click();

    await expect(page).toHaveURL(/tab=participants/, { timeout: 15000 });
  });

  test('chat diagnose scoring responds in chat only (no persistent blockers panel)', async ({
    page,
  }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/events/${seed.eventId}`);

    const dialog = await openAssistant(page);
    await expect(dialog.getByText(/Scoring blockers/i)).toHaveCount(0);

    await sendChat(page, "what's preventing me from scoring");

    await expect(
      dialog.getByText(/Complete|Scoring looks unblocked|Lock|Taking you|Opening/i).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText(/Scoring blockers:/i)).toHaveCount(0);
  });

  test('whats next on empty create flashes tournament name field', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/tournaments');

    await openAssistant(page);
    await sendChat(page, 'create tournament');

    const nameField = page.locator('[data-guide-id="guide-field-tournament-name"]');
    await expect(nameField).toBeVisible({ timeout: 15000 });

    // Dismiss launch spotlight if it appeared on first open
    const guide = page.getByRole('dialog', { name: 'Guided highlight' });
    if (await guide.count()) {
      await guide.getByRole('button', { name: 'Got it' }).click();
    }

    await openAssistant(page);
    await sendChat(page, "what's next");

    await expect(
      assistantChat(page)
        .getByText(/tournament name|bowling center|Next up|Resuming|fill/i)
        .first()
    ).toBeVisible({ timeout: 15000 });
    await expect(nameField).toHaveClass(/guide-field-flash/, { timeout: 5000 });
    await expect(page.getByRole('dialog', { name: 'Guided highlight' })).toHaveCount(0);
  });

  test('skip launch guider when create modal already open', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/tournaments');

    const palette = await openPalette(page);
    await palette.getByLabel('Search director steps').fill('Create Tournament');
    await palette.getByRole('option', { name: /Create Tournament/i }).click();

    const nameField = page.locator('[data-guide-id="guide-field-tournament-name"]');
    await expect(nameField).toBeVisible({ timeout: 15000 });
    // Auto-open modal should not leave a launch-control guider behind the form.
    await expect(page.getByRole('dialog', { name: 'Guided highlight' })).toHaveCount(0);

    await openAssistant(page);
    await sendChat(page, 'create tournament');

    const chat = assistantChat(page);
    await expect(
      chat.getByText(/tournament name|Taking you|Create Tournament|bowling center|Opening|fill/i).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('dialog', { name: 'Guided highlight' })).toHaveCount(0);
  });

  test('take me there follows prior assistant suggestion', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/events/${seed.eventId}`);

    await openAssistant(page);
    await sendChat(page, 'register participants');
    await expect(
      assistantChat(page)
        .getByText(/Taking you to|Register participants|Opening/i)
        .first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/tab=participants/, { timeout: 15000 });

    await openAssistant(page);
    await sendChat(page, 'take me there');
    await expect(
      assistantChat(page)
        .getByText(/Next up|Taking you|Register participants|participants/i)
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('page context: from participants tab short roster command stays on participants', async ({
    page,
  }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/events/${seed.eventId}?tab=participants`);

    await openAssistant(page);
    await sendChat(page, 'add bowlers');
    await expect(
      assistantChat(page)
        .getByText(/participants|Taking you|Got it|bowlers|Register|Opening/i)
        .first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/tab=participants/, { timeout: 15000 });
  });

  test('packed tournament→event: open create, coach fill, advance after create', async ({
    page,
  }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/tournaments');

    const unique = `Pack Queue ${Date.now()}`;
    await openAssistant(page);
    await sendChat(
      page,
      `Create a tournament named ${unique} at ${seed.centerName} then create a team event named Pack Event with no reentries`
    );

    const chat = assistantChat(page);
    await expect(chat.getByText(/Queued.+→|Queued Create/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(chat.getByText(/click Create|fill|Looks like the required/i).first()).toBeVisible({
      timeout: 15000,
    });

    const nameField = page.locator('[data-guide-id="guide-field-tournament-name"]');
    await expect(nameField).toBeVisible({ timeout: 20000 });
    await expect(nameField).toHaveValue(new RegExp(unique));

    await closeAssistant(page);
    const createDialog = page.getByRole('dialog', { name: /Create New Tournament/i });
    await createDialog.getByRole('button', { name: 'Create Tournament' }).click();

    // Pass consume confirm if shown
    const passConfirm = page.getByRole('dialog').filter({ hasText: /tournament pass/i });
    if (await passConfirm.count()) {
      await passConfirm.getByRole('button', { name: /Create tournament/i }).click();
    }

    await expect(page.getByRole('heading', { name: unique })).toBeVisible({ timeout: 30000 });
    await openAssistant(page);
    await expect(assistantChat(page).getByText(/Continuing|Create event|Saved/i).first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('[data-guide-id="guide-field-event-name"]')).toBeVisible({
      timeout: 20000,
    });
  });

  test('explain field mid-queue does not clear remaining actions', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/tournaments');

    await openAssistant(page);
    await sendChat(
      page,
      `Create a tournament named Queue Stay ${Date.now()} then create an event named Keep Event`
    );
    await expect(assistantChat(page).getByText(/Queued.+→|Queued Create/i).first()).toBeVisible({
      timeout: 15000,
    });

    await sendChat(page, 'what does that mean');
    await expect(
      assistantChat(page).getByText(/Tournament name|Bowling center|Event name|Re-entr/i).first()
    ).toBeVisible({ timeout: 10000 });

    await sendChat(page, "what's next");
    await expect(
      assistantChat(page).getByText(/Resuming|Create tournament|fill|Click Create|Looks like/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('participant lookup navigates without dumping averages in chat', async ({ page }) => {
    const seed = getLiveSeed();
    const seedName = seed.bowlerNames[0];
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/events/${seed.eventId}?tab=participants`);
    await expect(page.getByText(seedName).first()).toBeVisible({ timeout: 20000 });

    await openAssistant(page);
    await sendChat(page, `where is ${seedName}`);
    const chat = assistantChat(page);
    await expect(chat.getByText(new RegExp(`Opening where you can see ${seedName}|${seedName}`, 'i')).first()).toBeVisible({
      timeout: 15000,
    });
    const body = await chat.innerText();
    expect(body).not.toMatch(/\b\d{2,3}\.\d\b/);

    await sendChat(page, 'what average were they playing at');
    await expect(page).toHaveURL(/tab=participants/, { timeout: 20000 });
    await expect(page.locator('[data-guide-id="guide-participant-average"]').first()).toBeVisible({
      timeout: 15000,
    });
    const after = await assistantChat(page).innerText();
    expect(after).not.toMatch(/\bqualifying average is\s+\d+/i);
  });

  test('misspelled bowler offers confirm choices', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/events/${seed.eventId}?tab=participants`);
    await expect(page.getByText(seed.bowlerNames[0]).first()).toBeVisible({ timeout: 20000 });

    await openAssistant(page);
    // Typo that should fuzzy toward Alex Ace / Alex Acre
    await sendChat(page, 'where is Alx Ace');
    const chat = assistantChat(page);
    await expect(chat.getByText(/close matches|Reply with a number|Opening|couldn't find/i).first()).toBeVisible({
      timeout: 15000,
    });

    const choices = chat.getByRole('group', { name: 'Bowler choices' });
    if (await choices.count()) {
      await choices.getByRole('button').first().click();
      await expect(chat.getByText(/Got it|Opening|where you can see/i).first()).toBeVisible({
        timeout: 15000,
      });
    }
  });

  test('SA + subscription pack shows queue summary live', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.saOnlyEmail || !seed.saOnlyEventId, 'No SA-only seed');
    await loginAsDirector(page, seed.saOnlyEmail!, seed.saOnlyPassword || seed.tdPassword);
    await page.goto(`/director/events/${seed.saOnlyEventId}`);

    await openAssistant(page);
    await sendChat(page, 'Configure side actions then open subscription');
    const chat = assistantChat(page);
    await expect(chat.getByText(/Queued/i).first()).toBeVisible({ timeout: 15000 });
    await expect(chat.getByText(/side action|subscription|plan/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('event B chain switches then re-runs lookup', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.bakerEventId, 'No baker event in seed');
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/events/${seed.eventId}?tab=participants`);
    await expect(page.getByText(seed.bowlerNames[0]).first()).toBeVisible({ timeout: 20000 });

    await openAssistant(page);
    await sendChat(page, 'ok now for event Baker, where is Baker One');
    await expect(
      assistantChat(page)
        .getByText(/Switching to event|couldn't find|Opening|close matches|Baker/i)
        .first()
    ).toBeVisible({ timeout: 20000 });
  });
});
