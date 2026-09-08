import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TournamentRead } from '@/types/tournament';
import {
  formatTournamentStatus,
  getTournamentStatus,
  getTournamentStatusInfo,
  getTournamentStatusInfoDark,
  isTournamentActive,
  isTournamentCompleted,
} from '@/utils/tournamentStatus';

function tournament(overrides: Partial<TournamentRead> = {}): TournamentRead {
  return {
    id: 1,
    name: 'Test Open',
    organizer_id: 1,
    bowling_center_id: 1,
    is_active: true,
    start_date: '2026-07-01T00:00:00',
    end_date: '2026-07-03T00:00:00',
    created_at: '2026-01-01T00:00:00',
    updated_at: null,
    ...overrides,
  } as TournamentRead;
}

describe('getTournamentStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns cancelled when tournament is inactive', () => {
    expect(getTournamentStatus(tournament({ is_active: false }))).toBe('cancelled');
  });

  it('returns upcoming before start date', () => {
    expect(
      getTournamentStatus(
        tournament({
          start_date: '2026-08-01T00:00:00',
          end_date: '2026-08-03T00:00:00',
        })
      )
    ).toBe('upcoming');
  });

  it('returns ongoing between start and end dates', () => {
    expect(getTournamentStatus(tournament())).toBe('ongoing');
  });

  it('returns completed after end date', () => {
    expect(
      getTournamentStatus(
        tournament({
          start_date: '2026-05-01T00:00:00',
          end_date: '2026-05-03T00:00:00',
        })
      )
    ).toBe('completed');
  });

  it('returns upcoming when dates are missing', () => {
    expect(getTournamentStatus(tournament({ start_date: null, end_date: null }))).toBe('upcoming');
  });
});

describe('formatTournamentStatus', () => {
  it('title-cases status labels', () => {
    expect(formatTournamentStatus('ongoing')).toBe('Ongoing');
    expect(formatTournamentStatus('cancelled')).toBe('Cancelled');
    expect(formatTournamentStatus('upcoming')).toBe('Upcoming');
    expect(formatTournamentStatus('completed')).toBe('Completed');
  });
});

describe('getTournamentStatusInfo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns label and color classes for display', () => {
    const info = getTournamentStatusInfo(tournament());
    expect(info.status).toBe('ongoing');
    expect(info.label).toBe('Ongoing');
    expect(info.colorClasses).toContain('green');
  });
});

describe('getTournamentStatusInfoDark', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns dark-theme classes for each status', () => {
    expect(getTournamentStatusInfoDark(tournament()).colorClasses).toContain('bg-green-600');
    expect(
      getTournamentStatusInfoDark(tournament({ is_active: false })).colorClasses
    ).toContain('bg-red-600');
  });
});

describe('tournament status helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects active vs completed tournaments', () => {
    expect(isTournamentActive(tournament())).toBe(true);
    expect(isTournamentActive(tournament({ is_active: false }))).toBe(false);
    expect(
      isTournamentCompleted(
        tournament({
          start_date: '2026-05-01T00:00:00',
          end_date: '2026-05-03T00:00:00',
        })
      )
    ).toBe(true);
  });
});
