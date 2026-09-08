import { describe, expect, it } from 'vitest';
import {
  SideActionStatus,
  SideActionType,
  type SideAction,
} from '@/types/side_action';
import {
  buildBracketPoolLines,
  collectDeskScopeSquads,
  destinationGameCount,
  filterSideActionsByDeskScope,
  normalizeDeskScopeSelection,
  roundLabelForSquad,
  shouldShowDeskScopeFilter,
  deskScopeIsFiltered,
  type DeskScopeRound,
} from '@/components/side_actions/sideActionDeskScope';

function pool(
  id: number,
  squadId: number,
  squadName: string,
  enabled = true
): SideAction['pools'][number] {
  return {
    id,
    side_action_id: 1,
    squad_id: squadId,
    squad_name: squadName,
    is_enabled: enabled,
    status: SideActionStatus.REGISTRATION_OPEN,
    override_config: {},
    game_numbers: [1, 2, 3],
    entry_fee: 5,
  };
}

function bracketAction(
  id: number,
  name: string,
  pools: SideAction['pools']
): SideAction {
  return {
    id,
    tournament_id: 1,
    event_id: 2,
    name,
    side_action_type: SideActionType.BRACKET,
    max_participants: 8,
    entry_fee: 5,
    house_cut_percentage: 0,
    house_cut_type: 'amount',
    prize_type: 'amount',
    status: SideActionStatus.REGISTRATION_OPEN,
    is_active: true,
    check_in_required: false,
    game_numbers: [1, 2, 3],
    squad_scope_mode: 'all',
    pools,
    type_config: { handicap_mode: 'scratch' },
    created_at: '2026-08-31T00:00:00',
    updated_at: '2026-08-31T00:00:00',
  };
}

const rounds: DeskScopeRound[] = [
  {
    id: 10,
    round_number: 1,
    friendly_name: 'Qualifying',
    squads: [
      { id: 101, name: '9am' },
      { id: 102, name: '1pm' },
    ],
  },
  {
    id: 20,
    round_number: 2,
    friendly_name: 'Finals',
    squads: [{ id: 201, name: 'Final squad' }],
  },
];

describe('sideActionDeskScope', () => {
  it('shows filter when an event has 2+ squads or 2+ rounds', () => {
    expect(shouldShowDeskScopeFilter(rounds)).toBe(true);
    expect(
      shouldShowDeskScopeFilter([
        { id: 1, round_number: 1, squads: [{ id: 1, name: 'Only' }] },
      ])
    ).toBe(false);
    expect(
      shouldShowDeskScopeFilter([
        {
          id: 1,
          round_number: 1,
          squads: [{ id: 1, name: 'Qual' }],
        },
        {
          id: 2,
          round_number: 2,
          squads: [{ id: 2, name: 'Final' }],
        },
      ])
    ).toBe(true);
    expect(
      shouldShowDeskScopeFilter([
        { id: 1, round_number: 1, squads: [] },
        { id: 2, round_number: 2, squads: [] },
      ])
    ).toBe(true);
  });

  it('collects unique squads across rounds', () => {
    expect(collectDeskScopeSquads(rounds).map((s) => s.name)).toEqual([
      '9am',
      '1pm',
      'Final squad',
    ]);
  });

  it('builds one bracket line per enabled squad pool', () => {
    const actions = [
      bracketAction(1, 'Scratch 1-3', [
        pool(11, 101, '9am'),
        pool(12, 102, '1pm'),
        pool(13, 201, 'Final squad', false),
      ]),
    ];
    const lines = buildBracketPoolLines(actions, rounds, {
      roundId: null,
      squadId: null,
    });
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.pool.squad_name)).toEqual(['9am', '1pm']);
  });

  it('filters bracket lines to one squad', () => {
    const actions = [
      bracketAction(1, 'Scratch 1-3', [
        pool(11, 101, '9am'),
        pool(12, 102, '1pm'),
      ]),
    ];
    const lines = buildBracketPoolLines(actions, rounds, {
      roundId: null,
      squadId: 102,
    });
    expect(lines).toHaveLength(1);
    expect(lines[0].pool.squad_name).toBe('1pm');
  });

  it('filters side actions by round via squad membership', () => {
    const actions = [
      bracketAction(1, 'Qual pots', [pool(11, 101, '9am')]),
      bracketAction(2, 'Final pots', [pool(21, 201, 'Final squad')]),
    ];
    const filtered = filterSideActionsByDeskScope(actions, rounds, {
      roundId: 10,
      squadId: null,
    });
    expect(filtered.map((a) => a.name)).toEqual(['Qual pots']);
  });

  it('clears invalid squad when round changes', () => {
    expect(
      normalizeDeskScopeSelection(rounds, { roundId: 20, squadId: 101 })
    ).toEqual({ roundId: 20, squadId: null });
  });

  it('resolves round label from squad id', () => {
    expect(roundLabelForSquad(rounds, 101)).toBe('Round 1: Qualifying');
    expect(roundLabelForSquad(rounds, 201)).toBe('Round 2: Finals');
    expect(roundLabelForSquad(rounds, 999)).toBe('—');
  });

  it('resolves destination game count from squad or round', () => {
    const withCounts: DeskScopeRound[] = [
      {
        id: 10,
        round_number: 1,
        game_count: 5,
        squads: [
          { id: 101, name: '9am', game_count: 3 },
          { id: 102, name: 'inherits round' },
        ],
      },
    ];
    expect(destinationGameCount(withCounts, 101)).toBe(3);
    expect(destinationGameCount(withCounts, 102)).toBe(5);
    expect(destinationGameCount(withCounts, 999)).toBeNull();
  });

  it('detects when a desk scope filter is active', () => {
    expect(deskScopeIsFiltered({ roundId: null, squadId: null })).toBe(false);
    expect(deskScopeIsFiltered({ roundId: 1, squadId: null })).toBe(true);
    expect(deskScopeIsFiltered({ roundId: null, squadId: 2 })).toBe(true);
  });
});
