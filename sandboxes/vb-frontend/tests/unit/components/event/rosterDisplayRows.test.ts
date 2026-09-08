import { describe, expect, it } from 'vitest';

import type {
  RosterSideActionColumn,
  RosterSideActionSignupRow,
} from '@/api/side-actions';
import {
  isTeamPotSeatHolder,
  teamPotQuantityForBowler,
  teamPotTicketSumForTeam,
  buildRosterDisplayRows,
  compareRosterSignupRows,
  compareRowsByLastName,
  signupCellMode,
} from '@/components/event/rosterDisplayRows';

function poolCell(qty: number, extras: Record<string, unknown> = {}) {
  return {
    pool_id: 1,
    squad_id: 1,
    squad_name: 'A',
    quantity: qty,
    is_all: false,
    all_estimate: null,
    is_eligible: true,
    team_has_entry: qty > 0,
    team_entry_holder_user_id: null,
    ...extras,
  };
}

describe('teamPotQuantityForBowler', () => {
  const column = {
    side_action_id: 10,
    entry_unit: 'team',
    pools: [{ pool_id: 1 }],
  } as RosterSideActionColumn;

  const pool = column.pools[0];

  it('uses this bowler personal tickets only (not teammate mirror)', () => {
    const rows = [
      {
        user_id: 1,
        team_id: 5,
        signups: {
          '10': {
            pools: [
              poolCell(2, { team_entry_holder_user_id: 1, team_has_entry: true }),
            ],
          },
        },
      },
      {
        user_id: 2,
        team_id: 5,
        signups: {
          '10': {
            pools: [
              poolCell(0, { team_entry_holder_user_id: 1, team_has_entry: true }),
            ],
          },
        },
      },
      {
        user_id: 3,
        team_id: 9,
        signups: { '10': { pools: [poolCell(4)] } },
      },
    ] as unknown as RosterSideActionSignupRow[];

    expect(teamPotQuantityForBowler(rows[0], column, pool)).toBe(2);
    expect(teamPotQuantityForBowler(rows[1], column, pool)).toBe(0);
    expect(teamPotTicketSumForTeam(5, column, pool, rows)).toBe(2);
  });
});

describe('isTeamPotSeatHolder', () => {
  const column = {
    side_action_id: 10,
    entry_unit: 'team',
    pools: [{ pool_id: 1 }],
  } as RosterSideActionColumn;
  const pool = column.pools[0];

  it('marks only the holder / ticketed bowler as enrolled', () => {
    const holder = {
      user_id: 1,
      team_id: 5,
      signups: {
        '10': {
          pools: [
            poolCell(8, { team_entry_holder_user_id: 1, team_has_entry: true }),
          ],
        },
      },
    } as unknown as RosterSideActionSignupRow;
    const teammate = {
      user_id: 2,
      team_id: 5,
      signups: {
        '10': {
          pools: [
            poolCell(0, { team_entry_holder_user_id: 1, team_has_entry: true }),
          ],
        },
      },
    } as unknown as RosterSideActionSignupRow;

    expect(isTeamPotSeatHolder(holder, column, pool)).toBe(true);
    expect(isTeamPotSeatHolder(teammate, column, pool)).toBe(false);
  });
});

describe('signupCellMode', () => {
  it('gives team pots an edit cell on the team line only', () => {
    expect(signupCellMode('team', 'team')).toBe('edit');
    expect(signupCellMode('bowler', 'team')).toBe('blank');
  });

  it('gives bowler pots an edit cell on the bowler line only', () => {
    expect(signupCellMode('bowler', 'bowler')).toBe('edit');
    expect(signupCellMode('team', 'bowler')).toBe('blank');
    expect(signupCellMode('bowler', undefined)).toBe('edit');
  });
});

describe('buildRosterDisplayRows', () => {
  const teamHg = {
    side_action_id: 10,
    entry_unit: 'team',
    pools: [{ pool_id: 1 }],
  } as RosterSideActionColumn;
  const bowlerHg = {
    side_action_id: 20,
    entry_unit: 'bowler',
    pools: [{ pool_id: 2 }],
  } as RosterSideActionColumn;

  const john = {
    user_id: 1,
    name: 'John Smith',
    team_id: 5,
    team_name: 'Aces',
    signups: {},
    total_owed: 0,
    total_paid: 0,
  } as unknown as RosterSideActionSignupRow;
  const jane = {
    user_id: 2,
    name: 'Jane Doe',
    team_id: 5,
    team_name: 'Aces',
    signups: {},
    total_owed: 0,
    total_paid: 0,
  } as unknown as RosterSideActionSignupRow;
  const solo = {
    user_id: 3,
    name: 'Solo Bowler',
    team_id: null,
    team_name: null,
    signups: {},
    total_owed: 0,
    total_paid: 0,
  } as unknown as RosterSideActionSignupRow;

  it('nests team header then members when nestTeamMembers is on', () => {
    const rows = buildRosterDisplayRows([john, jane, solo], [teamHg, bowlerHg], {
      groupByTeam: false,
      nestTeamMembers: true,
    });
    expect(rows.map((r) => r.key)).toEqual([
      'team:5',
      'user:2',
      'user:1',
      'user:3',
    ]);
    expect(rows[0].kind).toBe('team');
    expect(rows[1]).toMatchObject({ kind: 'bowler', nestedUnderTeam: true });
    expect(rows[2]).toMatchObject({ kind: 'bowler', nestedUnderTeam: true });
    expect(rows[3]).toMatchObject({ kind: 'bowler' });
    expect(
      rows[3].kind === 'bowler' ? rows[3].nestedUnderTeam : undefined
    ).toBeUndefined();
  });

  it('hides members under the team row when grouping without nesting', () => {
    const rows = buildRosterDisplayRows([john, jane], [bowlerHg], {
      groupByTeam: true,
      nestTeamMembers: false,
    });
    expect(rows.map((r) => r.key)).toEqual(['team:5']);
  });
});

describe('compareRowsByLastName', () => {
  it('sorts by last name then first names', () => {
    const a = { name: 'Pat Bowler' } as RosterSideActionSignupRow;
    const b = { name: 'Alex Archer' } as RosterSideActionSignupRow;
    const c = { name: 'Sam Bowler' } as RosterSideActionSignupRow;
    expect(compareRowsByLastName(b, a)).toBeLessThan(0);
    expect(compareRowsByLastName(a, c)).toBeLessThan(0);
  });
});

describe('compareRosterSignupRows', () => {
  it('sorts by first name', () => {
    const rows = [
      { name: 'Pat Bowler' },
      { name: 'Alex Archer' },
      { name: 'Sam Bowler' },
    ] as RosterSideActionSignupRow[];
    const sorted = [...rows].sort((a, b) =>
      compareRosterSignupRows(a, b, 'first_name')
    );
    expect(sorted.map((r) => r.name)).toEqual([
      'Alex Archer',
      'Pat Bowler',
      'Sam Bowler',
    ]);
  });

  it('sorts by team name then last name, with unteamed last', () => {
    const rows = [
      { name: 'Zed Solo', team_name: null },
      { name: 'Pat Bowler', team_name: 'Zebras' },
      { name: 'Alex Archer', team_name: 'Aces' },
      { name: 'Sam Bowler', team_name: 'Aces' },
    ] as RosterSideActionSignupRow[];
    const sorted = [...rows].sort((a, b) =>
      compareRosterSignupRows(a, b, 'team_name')
    );
    expect(sorted.map((r) => r.name)).toEqual([
      'Alex Archer',
      'Sam Bowler',
      'Pat Bowler',
      'Zed Solo',
    ]);
  });
});
