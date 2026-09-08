import { expect, test } from '@playwright/test';
import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('Event start date lock', () => {
  test('shows locked start after scoring and rejects moving start_date', async ({
    page,
  }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);

    // Seed event already has recorded scores; migration backfills scoring_started_at.
    await page.goto(`/director/events/${seed.eventId}`);
    await expect(page.getByRole('heading', { name: seed.eventName })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText(/locked after scoring started/i).first()).toBeVisible({
      timeout: 15000,
    });

    const rejectPatch = await page.request.patch(`/api/v1/events/${seed.eventId}`, {
      data: {
        start_date: '2099-06-01T10:00:00',
        end_date: '2099-06-02T18:00:00',
      },
    });
    expect(rejectPatch.status(), await rejectPatch.text()).toBeGreaterThanOrEqual(400);

    // Scoring tab remains available for past-start seed events (no future-start banner).
    await page.goto(`/director/events/${seed.eventId}?tab=game_scoring`);
    await expect(page.getByRole('heading', { name: seed.eventName })).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText(/Scoring opens at the event start date and time/i)
    ).toHaveCount(0);
  });
});
