/**
 * Regression checklist — each seeded competition-format event opens without error.
 * Maps to workbook sheet: Formats
 */
import { expect, test } from '@playwright/test';

import { loginAsDirector } from '../helpers/auth';
import { getLiveSeed } from '../helpers/liveSeed';
import { attachPageErrorCollector } from './helpers';

type FormatFixture = {
  id: keyof ReturnType<typeof getLiveSeed>;
  label: string;
  checklistRef: string;
};

const FORMAT_FIXTURES: FormatFixture[] = [
  { id: 'eventId', label: 'Eliminator (main)', checklistRef: 'FMT-eliminator' },
  { id: 'bakerEventId', label: 'Baker bracket', checklistRef: 'FMT-bracket-baker' },
  { id: 'mixedEventId', label: 'Mixed format chain', checklistRef: 'FMT-mixed' },
  { id: 'deEventId', label: 'Double elimination', checklistRef: 'FMT-bracket-de' },
  { id: 'stepladderEventId', label: 'Stepladder', checklistRef: 'FMT-stepladder' },
  { id: 'rrEventId', label: 'Round robin', checklistRef: 'FMT-round-robin' },
  { id: 'podsEventId', label: 'Pods', checklistRef: 'FMT-pods' },
  { id: 'teamsEventId', label: 'Teams event', checklistRef: 'FMT-teams' },
  { id: 'payoutEventId', label: 'Payout chain', checklistRef: 'FMT-payout' },
  { id: 'tiedEventId', label: 'Tied match play', checklistRef: 'FMT-match-play' },
];

test.describe('@checklist format events', () => {
  test.beforeEach(async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  });

  for (const fixture of FORMAT_FIXTURES) {
    test(`[${fixture.checklistRef}] ${fixture.label} event info loads`, async ({ page }) => {
      const seed = getLiveSeed();
      const eventId = seed[fixture.id] as number | undefined;
      test.skip(!eventId, `${fixture.label} was not seeded`);

      const errors = attachPageErrorCollector(page);
      await page.goto(`/director/events/${eventId}?tab=info`);
      await expect(page).toHaveURL(new RegExp(`/events/${eventId}`), { timeout: 20000 });
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 });
      expect(errors, `Errors on ${fixture.label}`).toEqual([]);
    });
  }

  test('[FMT-bracket] Baker format editor opens', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.bakerEventId, 'Baker event not seeded');
    await page.goto(`/director/events/${seed.bakerEventId}?tab=format_editor`);
    await expect(page.getByRole('heading', { name: 'Format Editor' })).toBeVisible({
      timeout: 15000,
    });
  });

  test('[FMT-stepladder] Stepladder format editor opens', async ({ page }) => {
    const seed = getLiveSeed();
    test.skip(!seed.stepladderEventId, 'Stepladder event not seeded');
    await page.goto(`/director/events/${seed.stepladderEventId}?tab=format_editor`);
    await expect(page.getByRole('heading', { name: 'Format Editor' })).toBeVisible({
      timeout: 15000,
    });
  });
});
