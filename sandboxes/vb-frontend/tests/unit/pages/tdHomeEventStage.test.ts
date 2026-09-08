import { describe, expect, it } from 'vitest';

import { resolveTdHomeLiveStage } from '@/pages/tournament_director/tdHomeEventStage';

const event = {
  id: 1,
  name: 'Scratch Singles',
  tournament_id: 10,
  start_date: '2026-08-24T09:00:00',
  end_date: '2026-08-24T18:00:00',
};

describe('resolveTdHomeLiveStage', () => {
  it('links to game scoring when a round is in progress', () => {
    const stage = resolveTdHomeLiveStage(
      { ...event, signups_manually_closed: false, published_at: '2026-08-01T00:00:00' },
      [{ status: 'in_progress', friendly_name: 'Match Play', round_number: 2 }]
    );
    expect(stage.key).toBe('scoring');
    expect(stage.label).toBe('Game Scoring');
    expect(stage.tab).toBe('game_scoring');
    expect(stage.summary).toBe('Match Play in progress');
  });

  it('links to sign-ups when registration is still open and scoring has not started', () => {
    const stage = resolveTdHomeLiveStage(
      {
        ...event,
        published_at: '2026-08-01T00:00:00',
        signups_manually_closed: false,
      },
      [{ status: 'scheduled' }]
    );
    expect(stage.key).toBe('signups');
    expect(stage.tab).toBe('participants');
  });

  it('links to lane assignments after lanes are placed but before scoring starts', () => {
    const stage = resolveTdHomeLiveStage(event, [
      { status: 'scheduled', squads: [{ start_lane: 3, end_lane: 4 }] },
    ]);
    expect(stage.key).toBe('lanes');
    expect(stage.tab).toBe('lane_assignment');
  });

  it('links to standings when the event is complete', () => {
    const stage = resolveTdHomeLiveStage(
      { ...event, completed_at: '2026-08-24T18:00:00' },
      [{ status: 'completed' }]
    );
    expect(stage.key).toBe('standings');
    expect(stage.tab).toBe('standings');
  });

  it('combines the last completed round with the round in progress', () => {
    const stage = resolveTdHomeLiveStage(event, [
      { status: 'completed', friendly_name: 'Qualifying', round_number: 1 },
      { status: 'in_progress', friendly_name: 'Match Play', round_number: 2 },
    ]);
    expect(stage.summary).toBe('Qualifying complete, Match Play in progress');
  });
});
