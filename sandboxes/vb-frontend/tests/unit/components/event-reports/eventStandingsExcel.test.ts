import { describe, expect, it } from 'vitest';

import type { EventStandingsReport } from '@/api/event-reports';
import {
  buildStandingsExcelCsv,
  standingsExcelFilename,
} from '@/components/event-reports/eventStandingsExcel';

const options = {
  showTeamNames: true,
  showBowlerNames: true,
  includeGameScores: true,
  showIndividualTeamScores: false,
};

function report(partial: Partial<EventStandingsReport> = {}): EventStandingsReport {
  return {
    report_type: 'event_standings',
    tournament_id: 9,
    tournament_name: 'Open Classic',
    scope: 'event',
    basis: 'final',
    include_prizes: true,
    include_handicap: true,
    show_cut_line: false,
    sections: [
      {
        event_id: 42,
        event_name: 'Singles',
        event_format: 'singles',
        basis_label: 'Final',
        round_id: 1,
        round_number: 1,
        is_complete: true,
        rows: [
          {
            place: 1,
            place_label: '1st',
            score_scratch: 620,
            bonus_pins: 0,
            handicap_pins: 30,
            score_handicap: 650,
            sort_score: 650,
            prize_amount: 150,
            display_name: 'Jane Doe',
            is_team_row: false,
            bowlers: [{ display_name: 'Jane Doe' }],
            games: [
              { game_number: 1, score_scratch: 210, score_handicap: 220 },
              { game_number: 2, score_scratch: 200, score_handicap: 210 },
              { game_number: 3, score_scratch: 210, score_handicap: 220, dylg_dropped: true },
            ],
            squad_ids: [1],
          },
        ],
      },
    ],
    ...partial,
  };
}

describe('buildStandingsExcelCsv', () => {
  it('writes place, name, totals, and game columns', () => {
    const csv = buildStandingsExcelCsv(report(), options);
    expect(csv).toContain('Place');
    expect(csv).toContain('Jane Doe');
    expect(csv).toContain('620');
    expect(csv).toContain('Game 1');
    expect(csv).toContain('210 (dropped)');
    expect(csv).toContain('150');
  });

  it('omits game columns when includeGameScores is false', () => {
    const csv = buildStandingsExcelCsv(report(), { ...options, includeGameScores: false });
    expect(csv).not.toContain('Game 1');
  });

  it('adds a stepladder match row', () => {
    const csv = buildStandingsExcelCsv(
      report({
        sections: [
          {
            event_id: 42,
            event_name: 'Singles',
            event_format: 'singles',
            basis_label: 'Final',
            is_complete: true,
            layout: 'stepladder_final',
            rows: [],
            stepladder: {
              title: 'Stepladder',
              matches: [
                {
                  match_series_id: 1,
                  match_label: 'Match 1',
                  display_order: 1,
                  status: 'completed',
                  sides: [
                    {
                      side: 1,
                      display_name: 'Seed 2',
                      seed: 2,
                      game_scores: [200, 190],
                      match_total: 390,
                      is_winner: true,
                      is_tbd: false,
                      place: 1,
                      prize_amount: 400,
                    },
                  ],
                },
              ],
            },
          },
        ],
      }),
      options
    );
    expect(csv).toContain('stepladder');
    expect(csv).toContain('Seed 2');
    expect(csv).toContain('Match 1');
    expect(csv).toContain('Yes');
  });
});

describe('standingsExcelFilename', () => {
  it('uses tournament, event, and standings stem', () => {
    expect(standingsExcelFilename(report())).toMatch(/Open_Classic_Singles_standings\.csv$/);
  });
});
