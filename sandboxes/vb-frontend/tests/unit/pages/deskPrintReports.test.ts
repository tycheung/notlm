import { describe, expect, it } from 'vitest';

import {
  buildLanePairConflictsReportDocument,
  filterLaneConflictsForEvent,
} from '@/components/event-reports/buildLanePairConflictsReportDocument';
import {
  buildEventStepladderReportDocument,
  isStepladderCompetitionMethod,
} from '@/components/event-reports/buildEventStepladderReportDocument';
import { buildBracketConflictsReportDocument } from '@/components/side_actions/reports/buildBracketConflictsReportDocument';
import type { TournamentLaneConflictReport } from '@/types/tournament';

describe('lane pair conflicts print', () => {
  const report: TournamentLaneConflictReport = {
    rows: [
      {
        user_id: 1,
        display_name: 'Ada',
        pair_low: 5,
        pair_high: 6,
        occurrence_count: 2,
        severity: 'warning',
        occurrences: [
          {
            event_id: 10,
            event_name: 'Singles',
            round_id: 1,
            round_number: 1,
            squad_id: 1,
            squad_name: 'A',
            squad_start: null,
            assigned_lane: 5,
            game_number: 2,
            source: 'stamp',
            is_reentry: false,
          },
          {
            event_id: 11,
            event_name: 'Doubles',
            round_id: 2,
            round_number: 1,
            squad_id: 2,
            squad_name: 'B',
            squad_start: null,
            assigned_lane: 5,
            game_number: 1,
            source: 'stamp',
            is_reentry: false,
          },
        ],
      },
    ],
    meta: { events_with_overrides: [] },
  };

  it('keeps rows that touch the selected event and prints names', () => {
    const filtered = filterLaneConflictsForEvent(report, 10);
    expect(filtered.rows).toHaveLength(1);
    const doc = buildLanePairConflictsReportDocument({
      report: filtered,
      tournamentName: 'Open',
      eventName: 'Singles',
    });
    expect(doc.html).toContain('Ada');
    expect(doc.html).toContain('5–6');
    expect(doc.html).toContain('Doubles');
  });
});

describe('stepladder print', () => {
  it('detects stepladder methods and prints the climb', () => {
    expect(isStepladderCompetitionMethod('stepladder')).toBe(true);
    expect(isStepladderCompetitionMethod('bracket')).toBe(false);
    const doc = buildEventStepladderReportDocument({
      matchSeries: [
        {
          id: 1,
          round_id: 4,
          event_id: 9,
          race_to_wins: 1,
          max_games: 1,
          status: 'completed',
          wins_side_0: 1,
          wins_side_1: 0,
          winner_side: 0,
          display_order: 0,
          bracket_template: null,
          match_label: 'Match 1',
          participants: [
            { side: 0, event_participant_id: 1, team_id: null, seed_order: 4 },
            { side: 1, event_participant_id: 2, team_id: null, seed_order: 5 },
          ],
        },
      ],
      isTeamEvent: false,
      participants: [
        { event_participant_id: 1, user_name: 'Lee' },
        { event_participant_id: 2, user_name: 'Pat' },
      ],
      tournamentName: 'Open',
      eventName: 'Singles',
      roundName: 'Finals',
    });
    expect(doc.html).toContain('Lee');
    expect(doc.html).toContain('Pat');
    expect(doc.html).toContain('Match 1');
    expect(doc.html).toContain('Winner: Lee');
  });
});

describe('bracket conflicts print', () => {
  it('omits OK rows unless includeOk', () => {
    const rows = [
      {
        a: 1,
        b: 2,
        co: 3,
        g1: 3,
        g2pot: 1,
        g2act: 0,
        g3pot: 0,
        g3act: 0,
        heat: 'HIGH' as const,
      },
      {
        a: 3,
        b: 4,
        co: 1,
        g1: 0,
        g2pot: 0,
        g2act: 0,
        g3pot: 0,
        g3act: 0,
        heat: 'OK' as const,
      },
    ];
    const elevated = buildBracketConflictsReportDocument({
      sideActionName: 'Saturday Brackets',
      rows,
      userDisplayNames: { 1: 'Ada', 2: 'Bev' },
      includeOk: false,
      bracketCount: 8,
    });
    expect(elevated.html).toContain('Ada / Bev');
    expect(elevated.html).not.toContain('User 3');
    const all = buildBracketConflictsReportDocument({
      sideActionName: 'Saturday Brackets',
      rows,
      includeOk: true,
      bracketCount: 8,
    });
    expect(all.html).toContain('User 3 / User 4');
  });
});
