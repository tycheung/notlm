import { describe, expect, it } from 'vitest';
import {
  summarizeBowlerBracketOutcomes,
  bowlerBracketPayoutFromReports,
  bowlerBracketPlacePayoutEstimate,
} from '@/utils/bowlerBracketOutcomes';
import { SideAction, SideActionStatus, SideActionType } from '@/types/side_action';
import type { Bracket, BracketMatch } from '@/utils/bracketEngine/types';

function match(partial: Partial<BracketMatch>): BracketMatch {
  return {
    id: 'm1',
    p1: null,
    p2: null,
    s1: '',
    s2: '',
    winner: null,
    tie: false,
    p1b: null,
    s1b: '',
    p2b: null,
    s2b: '',
    ...partial,
  };
}

function makeBracket(partial: Partial<Bracket> & { id: number }): Bracket {
  return {
    seating: [],
    rounds: [
      { matches: [] },
      { matches: [] },
      { matches: [] },
    ],
    ...partial,
  };
}

function makeSideAction(brackets: Bracket[]): SideAction {
  return {
    id: 1,
    tournament_id: 1,
    event_id: 1,
    name: 'Brackets',
    side_action_type: SideActionType.BRACKET,
    max_participants: 8,
    entry_fee: 5,
    house_cut_percentage: 0,
    house_cut_type: 'percentage',
    prize_type: 'amount',
    status: SideActionStatus.IN_PROGRESS,
    is_active: true,
    check_in_required: false,
    game_numbers: [1, 2, 3],
    squad_scope_mode: 'all',
    pools: [
      {
        id: 10,
        side_action_id: 1,
        squad_id: 1,
        squad_name: 'Squad A',
        is_enabled: true,
        status: SideActionStatus.IN_PROGRESS,
        override_config: {},
        game_numbers: [1, 2, 3],
        entry_fee: 5,
        bracket_engine: {
          brackets,
          user_display_names: { 7: 'Ada' },
        },
      },
    ],
    type_config: {},
    created_at: '',
    updated_at: '',
  };
}

describe('summarizeBowlerBracketOutcomes', () => {
  it('counts seated pots and final places without money', () => {
    const brackets = [
      makeBracket({
        id: 0,
        seating: [7, 2, 3, 4, 5, 6, 8, 9],
        rounds: [
          { matches: [] },
          { matches: [] },
          {
            matches: [
              match({
                p1: 7,
                p2: 2,
                s1: '200',
                s2: '180',
                winner: 7,
              }),
            ],
          },
        ],
      }),
      makeBracket({
        id: 1,
        seating: [7, 11, 12, 13, 14, 15, 16, 17],
        rounds: [
          { matches: [] },
          { matches: [] },
          {
            matches: [
              match({
                p1: 7,
                p2: 11,
                s1: '170',
                s2: '190',
                winner: 11,
              }),
            ],
          },
        ],
      }),
    ];
    const summary = summarizeBowlerBracketOutcomes(makeSideAction(brackets), 7);
    expect(summary.potsEntered).toBe(2);
    expect(summary.wins).toBe(1);
    expect(summary.seconds).toBe(1);
    expect(summary.detail).toContain('2 pots');
    expect(summary.detail).toContain('1 win');
    expect(summary.detail).not.toContain('$');
  });

  it('marks early-round losses as eliminated instead of in progress', () => {
    const brackets = [
      makeBracket({
        id: 0,
        seating: [7, 2, 3, 4, 5, 6, 8, 9],
        rounds: [
          {
            matches: [
              match({
                p1: 7,
                p2: 2,
                s1: '150',
                s2: '200',
                winner: 2,
              }),
            ],
          },
          { matches: [] },
          {
            matches: [
              match({
                p1: 2,
                p2: 3,
                s1: '210',
                s2: '190',
                winner: 2,
              }),
            ],
          },
        ],
      }),
    ];
    const summary = summarizeBowlerBracketOutcomes(makeSideAction(brackets), 7);
    expect(summary.potsEntered).toBe(1);
    expect(summary.eliminated).toBe(1);
    expect(summary.inProgress).toBe(0);
    expect(summary.detail).toContain('eliminated');
    expect(summary.detail).not.toMatch(/in progress/i);
  });

  it('returns empty seating message when bowler is not in pots', () => {
    const brackets = [
      makeBracket({
        id: 0,
        seating: [1, 2, 3, 4, 5, 6, 8, 9],
      }),
    ];
    const summary = summarizeBowlerBracketOutcomes(makeSideAction(brackets), 7);
    expect(summary.potsEntered).toBe(0);
    expect(summary.detail).toMatch(/not seated/i);
  });

  it('sums refunds and place rewards from financials reports', () => {
    const amount = bowlerBracketPayoutFromReports(
      [
        {
          side_action_id: 1,
          pool_id: 10,
          squad_id: 1,
          game_numbers: [1, 2, 3],
          max_brackets: 2,
          bracket_count: 2,
          total_tickets: 16,
          unplaced_tickets: 1,
          entry_fee: 5,
          payouts: { first: 25, second: 10 },
          quotas: [{ user_id: 7, count: 3, quota: 2, unused: 1 }],
          stats: {
            '7': {
              entered: 2,
              r1w: 1,
              r1l: 1,
              r2w: 1,
              r2l: 0,
              finals: 1,
              first: 1,
              second: 0,
              split: 0,
              reward: 25,
            },
          },
          financials: {
            total_collected: 80,
            total_refunds: 5,
            winnings: 25,
            total_payout: 30,
            fees: 10,
            unplaced_entries: 1,
            bracket_count: 2,
          },
          brackets: [],
        },
      ],
      7
    );
    expect(amount).toBe(30);
  });

  it('estimates place payouts from prize_distribution when needed', () => {
    const sa = makeSideAction([]);
    sa.prize_distribution = { '1': 25, '2': 10 };
    expect(
      bowlerBracketPlacePayoutEstimate(
        { wins: 1, seconds: 1, thirds: 0, fourths: 0, splits: 0 },
        sa
      )
    ).toBe(35);
  });

  it('estimates 3rd/4th place payouts when configured', () => {
    const sa = makeSideAction([]);
    sa.prize_distribution = { '1': 40, '2': 20, '3': 12, '4': 8 };
    expect(
      bowlerBracketPlacePayoutEstimate(
        { wins: 0, seconds: 0, thirds: 1, fourths: 1, splits: 0 },
        sa
      )
    ).toBe(20);
  });
});
