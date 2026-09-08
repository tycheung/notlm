import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TournamentManagementRow } from '@/pages/tournament_director/tournamentManagementUtils';
import {
  filterAndSortTournaments,
  getTournamentManagementPaths,
  uniqueTournamentOrganizerOptions,
} from '@/pages/tournament_director/tournamentManagementUtils';
import { Role } from '@/types/user';

function row(overrides: Partial<TournamentManagementRow> = {}): TournamentManagementRow {
  return {
    id: 1,
    name: 'Alpha Open',
    organizer_id: 1,
    bowling_center_id: 1,
    is_active: true,
    start_date: '2026-08-01T00:00:00',
    end_date: '2026-08-03T00:00:00',
    lanes_reserved: 8,
    centerName: 'Victory Lanes',
    centerCity: 'Columbus',
    centerState: 'OH',
    created_at: '2026-01-01T00:00:00',
    updated_at: null,
    ...overrides,
  } as TournamentManagementRow;
}

describe('filterAndSortTournaments', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters by search term across name and location', () => {
    const tournaments = [
      row({ id: 1, name: 'Alpha Open' }),
      row({ id: 2, name: 'Beta Classic', centerCity: 'Dublin' }),
    ];
    const result = filterAndSortTournaments({
      tournaments,
      searchTerm: 'dublin',
      statusFilter: 'all',
      organizerFilter: 'all',
      sortField: 'name',
      sortDirection: 'asc',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('filters by status and sorts by start date descending', () => {
    const tournaments = [
      row({ id: 1, start_date: '2026-09-01T00:00:00', end_date: '2026-09-03T00:00:00' }),
      row({ id: 2, start_date: '2026-08-01T00:00:00', end_date: '2026-08-03T00:00:00' }),
    ];
    const result = filterAndSortTournaments({
      tournaments,
      searchTerm: '',
      statusFilter: 'upcoming',
      organizerFilter: 'all',
      sortField: 'start_date',
      sortDirection: 'desc',
    });
    expect(result.map((t) => t.id)).toEqual([1, 2]);
  });

  it('sorts by end date ascending and treats missing dates as zero', () => {
    const tournaments = [
      row({ id: 1, end_date: '2026-09-03T00:00:00' }),
      row({ id: 2, end_date: null }),
      row({ id: 3, end_date: '2026-08-01T00:00:00' }),
    ];
    const result = filterAndSortTournaments({
      tournaments,
      searchTerm: '',
      statusFilter: 'all',
      organizerFilter: 'all',
      sortField: 'end_date',
      sortDirection: 'asc',
    });
    expect(result.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('sorts by location and status label', () => {
    const tournaments = [
      row({ id: 1, centerName: 'Zebra Lanes', start_date: '2026-06-01', end_date: '2026-06-02' }),
      row({ id: 2, centerName: 'Alpha Bowl', start_date: '2026-05-01', end_date: '2026-05-02' }),
      row({
        id: 3,
        centerName: 'Alpha Bowl',
        start_date: '2026-04-01',
        end_date: '2026-04-02',
        is_active: false,
      }),
    ];
    const byLocation = filterAndSortTournaments({
      tournaments,
      searchTerm: '',
      statusFilter: 'all',
      organizerFilter: 'all',
      sortField: 'location',
      sortDirection: 'asc',
    });
    expect(byLocation.map((t) => t.id)).toEqual([2, 3, 1]);

    const byStatus = filterAndSortTournaments({
      tournaments: [row({ id: 4, is_active: false }), row({ id: 5 })],
      searchTerm: '',
      statusFilter: 'all',
      organizerFilter: 'all',
      sortField: 'status',
      sortDirection: 'desc',
    });
    expect(byStatus.map((t) => t.id)).toEqual([5, 4]);
  });

  it('matches search against status label and city/state text', () => {
    const tournaments = [
      row({ id: 1, name: 'Hidden', centerCity: 'Columbus', centerState: 'OH' }),
      row({ id: 2, name: 'Visible', centerCity: 'Dublin', centerState: 'OH' }),
    ];
    const byCity = filterAndSortTournaments({
      tournaments,
      searchTerm: 'dublin',
      statusFilter: 'all',
      organizerFilter: 'all',
      sortField: 'name',
      sortDirection: 'asc',
    });
    expect(byCity).toHaveLength(1);
    expect(byCity[0].id).toBe(2);

    const ongoing = row({
      id: 3,
      start_date: '2026-07-01T00:00:00',
      end_date: '2026-07-10T00:00:00',
    });
    const byStatusLabel = filterAndSortTournaments({
      tournaments: [ongoing],
      searchTerm: 'ongoing',
      statusFilter: 'all',
      organizerFilter: 'all',
      sortField: 'name',
      sortDirection: 'asc',
    });
    expect(byStatusLabel).toHaveLength(1);
  });

  it('filters and sorts by tournament director name', () => {
    const tournaments = [
      row({ id: 1, organizer_id: 2, organizer_name: 'Director Test' }),
      row({ id: 2, organizer_id: 13, organizer_name: 'Alex Assistant' }),
      row({ id: 3, organizer_id: 2, organizer_name: 'Director Test' }),
    ];
    const bySearch = filterAndSortTournaments({
      tournaments,
      searchTerm: 'assistant',
      statusFilter: 'all',
      organizerFilter: 'all',
      sortField: 'name',
      sortDirection: 'asc',
    });
    expect(bySearch.map((t) => t.id)).toEqual([2]);

    const byTd = filterAndSortTournaments({
      tournaments,
      searchTerm: '',
      statusFilter: 'all',
      organizerFilter: '2',
      sortField: 'td',
      sortDirection: 'asc',
    });
    expect(byTd.map((t) => t.id)).toEqual([1, 3]);

    const sorted = filterAndSortTournaments({
      tournaments,
      searchTerm: '',
      statusFilter: 'all',
      organizerFilter: 'all',
      sortField: 'td',
      sortDirection: 'asc',
    });
    expect(sorted.map((t) => t.organizer_name)).toEqual([
      'Alex Assistant',
      'Director Test',
      'Director Test',
    ]);
  });

  it('builds unique TD filter options from organizer ids', () => {
    const options = uniqueTournamentOrganizerOptions([
      row({ organizer_id: 2, organizer_name: 'Director Test' }),
      row({ id: 4, organizer_id: 2, organizer_name: 'Director Test' }),
      row({ id: 5, organizer_id: 13, organizer_name: 'Alex Assistant' }),
    ]);
    expect(options).toEqual([
      { value: '13', label: 'Alex Assistant' },
      { value: '2', label: 'Director Test' },
    ]);
  });
});

describe('getTournamentManagementPaths', () => {
  it('returns director paths for TD role', () => {
    expect(getTournamentManagementPaths(Role.TD, 9)).toEqual({
      detailsPath: '/director/tournaments/9',
      editPath: '/director/tournaments/9/edit',
    });
  });

  it('returns admin paths for admin role', () => {
    expect(getTournamentManagementPaths(Role.ADMIN, 3)).toEqual({
      detailsPath: '/admin/tournaments/3',
      editPath: '/admin/tournaments/3/edit',
    });
  });

  it('returns public details path without edit for other roles', () => {
    expect(getTournamentManagementPaths(Role.BOWLER, 5)).toEqual({
      detailsPath: '/tournaments/5',
      editPath: '',
    });
    expect(getTournamentManagementPaths(null, 5)).toEqual({
      detailsPath: '/tournaments/5',
      editPath: '',
    });
  });
});
