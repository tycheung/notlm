import { describe, expect, it } from 'vitest';

import {
  eventParticipantsHref,
  pendingCountForTournament,
  pendingHrefForTournament,
  pendingTotalsForHome,
} from '@/pages/tournament_director/tdHomePendingLinks';

const rows = [
  { event_id: 21, tournament_id: 10, pending_count: 2 },
  { event_id: 22, tournament_id: 10, pending_count: 1 },
  { event_id: 31, tournament_id: 44, pending_count: 4 },
];

describe('tdHomePendingLinks', () => {
  it('builds the participant-management href for an event', () => {
    expect(eventParticipantsHref('/director/events/21')).toBe('/director/events/21?tab=participants');
  });

  it('links a tournament with one pending event into that event', () => {
    expect(
      pendingHrefForTournament(rows, 44, (id) => `/director/events/${id}`, '/director/actions-needed')
    ).toBe('/director/events/31?tab=participants');
  });

  it('sends a tournament with multiple pending events to actions needed', () => {
    expect(pendingCountForTournament(rows, 10)).toBe(3);
    expect(
      pendingHrefForTournament(rows, 10, (id) => `/director/events/${id}`, '/director/actions-needed')
    ).toBe('/director/actions-needed');
  });

  it('uses pending signup rows as the dashboard total when that fetch succeeded', () => {
    expect(
      pendingTotalsForHome(rows, true, [
        { id: 10, pending_registrations: 99 },
        { id: 44, pending_registrations: 1 },
      ])
    ).toEqual({
      byTournamentId: { 10: 3, 44: 4 },
      total: 7,
    });
  });
});
