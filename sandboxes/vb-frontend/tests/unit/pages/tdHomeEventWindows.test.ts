import { describe, expect, it } from 'vitest';

import {
  addDaysToDateOnly,
  bucketTdHomeEvents,
  eventIsHappeningOnDate,
  eventStartsInComingUpWindow,
  TD_HOME_COMING_UP_DAYS,
  type TdHomeEventLike,
} from '@/pages/tournament_director/tdHomeEventWindows';

const TODAY = '2026-08-24';

function event(overrides: Partial<TdHomeEventLike> = {}): TdHomeEventLike {
  return {
    id: 1,
    name: 'Singles',
    tournament_id: 10,
    start_date: '2026-08-24T09:00:00',
    end_date: '2026-08-24T18:00:00',
    ...overrides,
  };
}

describe('tdHomeEventWindows', () => {
  it('treats a multi-day event as happening on each spanned calendar day', () => {
    const multiDay = event({
      start_date: '2026-08-23T09:00:00',
      end_date: '2026-08-25T18:00:00',
    });
    expect(eventIsHappeningOnDate(multiDay, '2026-08-23')).toBe(true);
    expect(eventIsHappeningOnDate(multiDay, TODAY)).toBe(true);
    expect(eventIsHappeningOnDate(multiDay, '2026-08-25')).toBe(true);
    expect(eventIsHappeningOnDate(multiDay, '2026-08-22')).toBe(false);
    expect(eventIsHappeningOnDate(multiDay, '2026-08-26')).toBe(false);
  });

  it('places upcoming starts in the next 10 days, excluding today', () => {
    const tomorrow = event({
      id: 2,
      name: 'Tomorrow singles',
      start_date: '2026-08-25T09:00:00',
      end_date: '2026-08-25T18:00:00',
    });
    const onDay10 = event({
      id: 3,
      name: 'Day 10 doubles',
      start_date: `${addDaysToDateOnly(TODAY, TD_HOME_COMING_UP_DAYS)}T09:00:00`,
      end_date: `${addDaysToDateOnly(TODAY, TD_HOME_COMING_UP_DAYS)}T18:00:00`,
    });
    const onDay11 = event({
      id: 4,
      name: 'Too far',
      start_date: `${addDaysToDateOnly(TODAY, TD_HOME_COMING_UP_DAYS + 1)}T09:00:00`,
      end_date: `${addDaysToDateOnly(TODAY, TD_HOME_COMING_UP_DAYS + 1)}T18:00:00`,
    });
    const inProgress = event({ id: 5, name: 'Today singles' });

    expect(eventStartsInComingUpWindow(tomorrow, TODAY)).toBe(true);
    expect(eventStartsInComingUpWindow(onDay10, TODAY)).toBe(true);
    expect(eventStartsInComingUpWindow(onDay11, TODAY)).toBe(false);
    expect(eventStartsInComingUpWindow(inProgress, TODAY)).toBe(false);
  });

  it('buckets only events for managed tournaments and keeps happening today out of coming up', () => {
    const buckets = bucketTdHomeEvents(
      [
        event({ id: 1, name: 'Today A' }),
        event({
          id: 2,
          name: 'Weekend B',
          start_date: '2026-08-29T09:00:00',
          end_date: '2026-08-30T18:00:00',
        }),
        event({
          id: 3,
          name: 'Other TD event',
          tournament_id: 99,
          start_date: '2026-08-29T09:00:00',
          end_date: '2026-08-29T18:00:00',
        }),
      ],
      [10],
      TODAY
    );

    expect(buckets.happeningToday.map((item) => item.name)).toEqual(['Today A']);
    expect(buckets.comingUp.map((item) => item.name)).toEqual(['Weekend B']);
  });
});
