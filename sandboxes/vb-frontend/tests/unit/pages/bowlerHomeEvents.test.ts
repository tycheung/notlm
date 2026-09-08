import { describe, expect, it } from 'vitest';

import { uniqueTournamentCount } from '@/pages/dashboard/bowlerHomeEvents';

describe('uniqueTournamentCount', () => {
  it('counts one tournament when the bowler has multiple events in it', () => {
    expect(
      uniqueTournamentCount([
        { tournament_id: 10 } as never,
        { tournament_id: 10 } as never,
        { tournament_id: 10 } as never,
      ])
    ).toBe(1);
  });
});
