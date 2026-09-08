import { describe, expect, it } from 'vitest';
import type { MatchSeriesRead } from '@/api/round-match-series';
import { buildEventBracketReportDocument } from '@/components/event-reports/buildEventBracketReportDocument';
import type { EventTeamRead } from '@/types/event_team';

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

function team(id: number, name: string): EventTeamRead {
  return {
    id,
    event_id: 6,
    team_number: id,
    entry_number: 1,
    display_name: name,
    is_reentry: false,
    registered_at: '',
    registered_by: 1,
    created_at: '',
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

describe('buildEventBracketReportDocument', () => {
  it('builds a landscape 16-team bracket with traditional round labels', () => {
    const doc = buildEventBracketReportDocument({
      matchSeries: singleElimField(16),
      isTeamEvent: true,
      bracketMode: 'single_elimination',
      teams: [team(1, 'Lane 14'), team(2, 'Lane 7')],
      tournamentName: 'Victory Classic',
      eventName: 'Leading Lady Trios',
      roundName: 'Match Play Finals',
    });

    expect(doc.title).toBe('Bracket');
    expect(doc.suggestedFilename).toContain('bracket');
    expect(doc.suggestedFilename).toContain('Leading_Lady_Trios');
    expect(doc.suggestedFilename).toContain('Match_Play_Finals');
    expect(doc.html).toContain('letter landscape');
    expect(doc.html).toContain('Victory Classic · Leading Lady Trios · Match Play Finals');
    expect(doc.html).toContain('16-team single elimination');
    expect(doc.html).toContain('Round of 16');
    expect(doc.html).toContain('Quarterfinals');
    expect(doc.html).toContain('Semifinals');
    expect(doc.html).toContain('Final');
    expect(doc.html).toContain('Lane 14');
    expect(doc.html).toContain('class="eb-canvas"');
  });

  it('puts double-elim sections on their own pages', () => {
    const doc = buildEventBracketReportDocument({
      matchSeries: [
        series({ id: 1, bracket_round: 0, bracket_slot: 0, bracket_segment: 'winner' }),
        series({ id: 2, bracket_round: 0, bracket_slot: 1, bracket_segment: 'winner' }),
        series({ id: 3, bracket_round: 1, bracket_slot: 0, bracket_segment: 'winner' }),
        series({ id: 4, bracket_round: 0, bracket_slot: 0, bracket_segment: 'loser' }),
      ],
      isTeamEvent: true,
      bracketMode: 'double_elimination',
      teams: [team(1, 'Aces'), team(2, 'Deuces')],
      eventName: 'Trios',
      roundName: 'Finals',
    });

    expect(doc.html).toContain('Winners bracket');
    expect(doc.html).toContain('Losers bracket');
    expect(doc.html).toContain('4-team double elimination');
    expect(doc.html).toContain('eb-page');
  });

  it('marks completed matches with winner styling', () => {
    const scored = series({
      id: 1,
      bracket_round: 0,
      bracket_slot: 0,
      status: 'complete',
      winner_side: 0,
      wins_side_0: 1,
      wins_side_1: 0,
      match_label: 'M1',
      participants: [
        {
          side: 0,
          seed_order: 1,
          event_participant_id: null,
          team_id: 1,
        },
        {
          side: 1,
          seed_order: 2,
          event_participant_id: null,
          team_id: 2,
        },
      ],
    });
    const doc = buildEventBracketReportDocument({
      matchSeries: [scored],
      isTeamEvent: true,
      bracketMode: 'single_elimination',
      teams: [team(1, 'Lane 14'), team(2, 'Lane 7')],
    });
    expect(doc.html).toContain('M1');
    expect(doc.html).toContain('complete');
    expect(doc.html).toContain('eb-winner');
    expect(doc.html).toContain('letter portrait');
  });
});
