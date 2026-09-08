import { describe, expect, it } from 'vitest';

import type {
  AliveListReport,
  BracketsReport,
  EntrySummaryReport,
} from '@/api/side-actions';
import { buildAliveListReportDocument } from '@/components/side_actions/reports/buildAliveListReportDocument';
import { buildBracketsReportDocument } from '@/components/side_actions/reports/buildBracketsReportDocument';
import { buildEntrySummaryReportDocument } from '@/components/side_actions/reports/buildEntrySummaryReportDocument';

const reportContext = {
  tournament_id: 1,
  tournament_name: 'Victory Open',
  event_id: 2,
  event_name: 'Singles',
  side_action_id: 3,
  side_action_name: 'Early Brackets',
};

describe('bracket report pool context', () => {
  it('prints the selected squad and pool in an entry summary', () => {
    const document = buildEntrySummaryReportDocument({
      ...reportContext,
      report_type: 'entry_summary',
      scope: 'this',
      pool_id: 11,
      squad_id: 21,
      squad_name: 'Morning Squad',
      source: 'generated',
      total_entries: 8,
      bracket_count: 1,
      unplaced_tickets: 0,
      financials: {
        total_collected: 80,
        total_refunds: 0,
        winnings: 70,
        total_payout: 70,
        fees: 10,
      },
    } satisfies EntrySummaryReport);

    expect(document.title).toContain('Morning Squad');
    expect(document.suggestedFilename).toContain('Morning_Squad');
    expect(document.html).toContain('Squad: Morning Squad · Pool 11');
  });

  it('prints the effective games in alive-list and wall-sheet documents', () => {
    const alive = buildAliveListReportDocument({
      ...reportContext,
      report_type: 'alive_list',
      pool_id: 11,
      squad_id: 21,
      squad_name: 'Morning Squad',
      display_mode: 'total_only',
      as_of_game: 4,
      as_of_label: 'Game 4',
      last_synced_game: 4,
      available_games: [1, 4],
      game_window: [1, 4, 5],
      complete: false,
      bracket_count: 1,
      alive_bowler_count: 0,
      alive_ticket_count: 0,
      rows: [],
    } satisfies AliveListReport);
    const brackets = buildBracketsReportDocument({
      ...reportContext,
      report_type: 'brackets',
      pool_id: 11,
      squad_id: 21,
      squad_name: 'Morning Squad',
      game_numbers: [1, 4, 5],
      bracket_count: 0,
      brackets: [],
      user_display_names: {},
      payouts: { first: 50, second: 20 },
      bye_payouts: { first: 40, second: 20 },
    } satisfies BracketsReport);

    expect(alive.html).toContain('Morning Squad · Pool 11 · Games 1 → 4 → 5');
    expect(alive.suggestedFilename).toContain('Games_1_4_5');
    expect(brackets.html).toContain('Morning Squad · Pool 11');
    expect(brackets.html).toContain('Games 1 → 4 → 5');
    expect(brackets.suggestedFilename).toContain('Games_1_4_5');
  });

  it('prints all-sets alive list scope with included bracket sets', () => {
    const alive = buildAliveListReportDocument({
      ...reportContext,
      report_type: 'alive_list',
      scope: 'all',
      side_action_id: null,
      side_action_name: 'All brackets',
      pool_id: null,
      squad_id: null,
      squad_name: null,
      display_mode: 'total_only',
      as_of_label: 'Current progress',
      available_games: [1, 2, 3],
      game_window: [1, 2, 3],
      complete: false,
      bracket_count: 12,
      alive_bowler_count: 4,
      alive_ticket_count: 9,
      included_side_actions: ['Handicap 1-3 — Squad 1 (1-3)', 'Scratch 2-4 — Squad 1 (2-4)'],
      rows: [
        {
          user_id: 1,
          display_name: 'Alice',
          alive_count: 3,
          bracket_numbers: [],
          opponents: [],
          first_count: 1,
          second_count: 0,
          split_count: 0,
        },
      ],
    } satisfies AliveListReport);

    expect(alive.title).toContain('All bracket sets');
    expect(alive.html).toContain('Included:');
    expect(alive.html).toContain('Handicap 1-3');
    expect(alive.html).toContain('All bracket sets');
  });
});
