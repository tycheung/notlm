import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MatchSeriesRead } from '@/api/round-match-series';
import EventBracketViewer from '@/components/event/formatEditor/EventBracketViewer';

function series(
  patch: Partial<MatchSeriesRead> & { id: number }
): MatchSeriesRead {
  return {
    round_id: 15,
    event_id: 6,
    race_to_wins: 1,
    max_games: 1,
    status: 'pending',
    wins_side_0: 0,
    wins_side_1: 0,
    winner_side: null,
    display_order: patch.id,
    bracket_template: 'single_elim',
    match_label: null,
    bracket_segment: 'winner',
    participants: [
      { side: 0, seed_order: 1, event_participant_id: null, team_id: 1 },
      { side: 1, seed_order: 2, event_participant_id: null, team_id: 2 },
    ],
    ...patch,
  };
}

function singleElimField(fieldSize: 4 | 8 | 16 | 32 | 64): MatchSeriesRead[] {
  const rounds = Math.log2(fieldSize);
  const out: MatchSeriesRead[] = [];
  let id = 1;
  for (let round = 0; round < rounds; round++) {
    const matches = fieldSize / 2 / 2 ** round;
    for (let slot = 0; slot < matches; slot++) {
      out.push(
        series({
          id: id++,
          bracket_round: round,
          bracket_slot: slot,
        })
      );
    }
  }
  return out;
}

describe('EventBracketViewer', () => {
  it('shows a 16-team single-elim diagram with traditional round labels', () => {
    render(
      <EventBracketViewer
        matchSeries={singleElimField(16)}
        isTeamEvent
        bracketMode="single_elimination"
        teams={[
          {
            id: 1,
            event_id: 6,
            team_number: 1,
            entry_number: 1,
            display_name: 'Lane 1',
            is_reentry: false,
            registered_at: '',
            registered_by: 1,
            created_at: '',
          },
          {
            id: 2,
            event_id: 6,
            team_number: 2,
            entry_number: 2,
            display_name: 'Lane 2',
            is_reentry: false,
            registered_at: '',
            registered_by: 1,
            created_at: '',
          },
        ]}
      />
    );
    expect(screen.getByText('16-team single elimination')).toBeInTheDocument();
    expect(screen.getByText('Round of 16')).toBeInTheDocument();
    expect(screen.getByText('Quarterfinals')).toBeInTheDocument();
    expect(screen.getByText('Semifinals')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
  });
});
