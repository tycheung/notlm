import { expect, test } from '@playwright/test';
import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('Director assistants', () => {
  test('tournament assistants modal shows seat count and hides on SA shell', async ({
    page,
  }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);

    await page.goto(`/director/tournaments/${seed.tournamentId}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: 20000,
    });

    const assistantsBtn = page.getByRole('button', { name: 'Assistant permissions' });
    await expect(assistantsBtn).toBeVisible({ timeout: 15000 });
    await assistantsBtn.click();
    await expect(page.getByText(/Assistant seats:\s*\d+\s+of\s+\d+/)).toBeVisible({
      timeout: 10000,
    });
    await page.keyboard.press('Escape');

    if (seed.saOnlyTournamentId) {
      await page.goto(`/director/tournaments/${seed.saOnlyTournamentId}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
        timeout: 20000,
      });
      await expect(
        page.getByRole('button', { name: 'Assistant permissions' })
      ).toHaveCount(0);
    }
  });
});
