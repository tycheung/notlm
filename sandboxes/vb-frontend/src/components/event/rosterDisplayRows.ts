import type {
  RosterSideActionColumn,
  RosterSideActionPoolColumn,
  RosterSideActionSignupPoolCell,
  RosterSideActionSignupRow,
} from '../../api/side-actions';
import { rosterDisplayedQuantity } from './rosterSignupUtils';

export type RosterDisplayRow =
  | {
      kind: 'bowler';
      key: string;
      row: RosterSideActionSignupRow;
      /** True when this bowler is listed under a team header (mixed/team pots). */
      nestedUnderTeam?: boolean;
    }
  | {
      kind: 'team';
      key: string;
      teamId: number;
      teamName: string;
      members: RosterSideActionSignupRow[];
      /** Actor for team-pot signup API calls (entry holder or first member). */
      primary: RosterSideActionSignupRow;
      totalOwed: number;
      totalPaid: number;
    };

export function lastNameFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 1];
}

export function firstNamesFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join(' ');
}

export function firstNameFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? '';
}

export type RosterSignupSortBy = 'first_name' | 'last_name' | 'team_name';

export function compareRowsByLastName(
  a: RosterSideActionSignupRow,
  b: RosterSideActionSignupRow
): number {
  const lastCmp = lastNameFromDisplayName(a.name).localeCompare(
    lastNameFromDisplayName(b.name),
    undefined,
    { sensitivity: 'base' }
  );
  if (lastCmp !== 0) return lastCmp;
  return firstNamesFromDisplayName(a.name).localeCompare(
    firstNamesFromDisplayName(b.name),
    undefined,
    { sensitivity: 'base' }
  );
}

export function compareRowsByFirstName(
  a: RosterSideActionSignupRow,
  b: RosterSideActionSignupRow
): number {
  const firstCmp = firstNameFromDisplayName(a.name).localeCompare(
    firstNameFromDisplayName(b.name),
    undefined,
    { sensitivity: 'base' }
  );
  if (firstCmp !== 0) return firstCmp;
  return compareRowsByLastName(a, b);
}

export function compareRowsByTeamName(
  a: RosterSideActionSignupRow,
  b: RosterSideActionSignupRow
): number {
  const aTeam = (a.team_name ?? '').trim();
  const bTeam = (b.team_name ?? '').trim();
  const aHas = aTeam.length > 0;
  const bHas = bTeam.length > 0;
  if (aHas !== bHas) return aHas ? -1 : 1;
  if (aHas && bHas) {
    const teamCmp = aTeam.localeCompare(bTeam, undefined, { sensitivity: 'base' });
    if (teamCmp !== 0) return teamCmp;
  }
  return compareRowsByLastName(a, b);
}

export function compareRosterSignupRows(
  a: RosterSideActionSignupRow,
  b: RosterSideActionSignupRow,
  sortBy: RosterSignupSortBy
): number {
  if (sortBy === 'first_name') return compareRowsByFirstName(a, b);
  if (sortBy === 'team_name') return compareRowsByTeamName(a, b);
  return compareRowsByLastName(a, b);
}

/** Team pots edit on the team line only; bowler pots edit on bowler lines only. */
export function signupCellMode(
  rowKind: 'team' | 'bowler',
  entryUnit: string | undefined
): 'edit' | 'blank' {
  const unit = entryUnit === 'team' ? 'team' : 'bowler';
  if (rowKind === 'team') return unit === 'team' ? 'edit' : 'blank';
  return unit === 'team' ? 'blank' : 'edit';
}

function compareTeamName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function primaryForTeam(
  members: RosterSideActionSignupRow[],
  teamColumns: RosterSideActionColumn[]
): RosterSideActionSignupRow {
  for (const col of teamColumns) {
    for (const pool of col.pools) {
      for (const member of members) {
        const cell = member.signups[String(col.side_action_id)];
        const poolCell = cell?.pools.find((p) => p.pool_id === pool.pool_id);
        const holder = poolCell?.team_entry_holder_user_id;
        if (holder != null && Number(holder) === Number(member.user_id)) {
          return member;
        }
        if (rosterDisplayedQuantity(poolCell) > 0) {
          return member;
        }
      }
    }
  }
  return members[0];
}

/** Resolve the pool cell to show/edit for a team row on a team pot. */
export function teamPoolCellForColumn(
  display: Extract<RosterDisplayRow, { kind: 'team' }>,
  column: RosterSideActionColumn,
  pool: RosterSideActionPoolColumn
): RosterSideActionSignupPoolCell | undefined {
  const primaryCell = display.primary.signups[String(column.side_action_id)]?.pools.find(
    (p) => p.pool_id === pool.pool_id
  );
  if (primaryCell && (rosterDisplayedQuantity(primaryCell) > 0 || primaryCell.team_has_entry)) {
    return primaryCell;
  }
  for (const member of display.members) {
    const poolCell = member.signups[String(column.side_action_id)]?.pools.find(
      (p) => p.pool_id === pool.pool_id
    );
    if (poolCell && (rosterDisplayedQuantity(poolCell) > 0 || poolCell.team_has_entry)) {
      return poolCell;
    }
  }
  return primaryCell;
}

/** Aggregate bowler-pot quantity across team members (read-only when grouped). */
export function teamMemberQuantitySum(
  display: Extract<RosterDisplayRow, { kind: 'team' }>,
  column: RosterSideActionColumn,
  pool: RosterSideActionPoolColumn
): number {
  let sum = 0;
  for (const member of display.members) {
    const poolCell = member.signups[String(column.side_action_id)]?.pools.find(
      (p) => p.pool_id === pool.pool_id
    );
    sum += rosterDisplayedQuantity(poolCell);
  }
  return sum;
}

/** True when any team member has All intent for this pool. */
export function teamMemberHasAll(
  members: RosterSideActionSignupRow[],
  column: RosterSideActionColumn,
  pool: RosterSideActionPoolColumn
): boolean {
  for (const member of members) {
    const poolCell = member.signups[String(column.side_action_id)]?.pools.find(
      (p) => p.pool_id === pool.pool_id
    );
    if (poolCell?.is_all) return true;
  }
  return false;
}

/**
 * Team-pot quantity for an ungrouped bowler row: this bowler's own tickets only.
 * Team-wide totals belong on Group by team rows — mirroring the seat onto every
 * teammate made individuals look personally enrolled in team pots.
 */
export function teamPotQuantityForBowler(
  row: RosterSideActionSignupRow,
  column: RosterSideActionColumn,
  pool: RosterSideActionPoolColumn
): number {
  const poolCell = row.signups[String(column.side_action_id)]?.pools.find(
    (p) => p.pool_id === pool.pool_id
  );
  return rosterDisplayedQuantity(poolCell);
}

/** True when this bowler is the recorded holder for a team-pot seat (or has tickets). */
export function isTeamPotSeatHolder(
  row: RosterSideActionSignupRow,
  column: RosterSideActionColumn,
  pool: RosterSideActionPoolColumn
): boolean {
  if (column.entry_unit !== 'team') return true;
  const poolCell = row.signups[String(column.side_action_id)]?.pools.find(
    (p) => p.pool_id === pool.pool_id
  );
  if (!poolCell) return false;
  if (rosterDisplayedQuantity(poolCell) > 0) return true;
  const holder = poolCell.team_entry_holder_user_id;
  return holder != null && Number(holder) === Number(row.user_id);
}

/** Sum of team-pot tickets across teammates (leftover detection / team-row totals). */
export function teamPotTicketSumForTeam(
  teamId: number,
  column: RosterSideActionColumn,
  pool: RosterSideActionPoolColumn,
  rosterRows: RosterSideActionSignupRow[]
): number {
  let sum = 0;
  for (const member of rosterRows) {
    if (member.team_id == null || Number(member.team_id) !== Number(teamId)) continue;
    const poolCell = member.signups[String(column.side_action_id)]?.pools.find(
      (p) => p.pool_id === pool.pool_id
    );
    sum += rosterDisplayedQuantity(poolCell);
  }
  return sum;
}

export function buildRosterDisplayRows(
  rows: RosterSideActionSignupRow[],
  columns: RosterSideActionColumn[],
  options: {
    groupByTeam: boolean;
    nestTeamMembers?: boolean;
    sortBy?: RosterSignupSortBy;
  }
): RosterDisplayRow[] {
  const nestTeamMembers = Boolean(options.nestTeamMembers);
  const groupByTeam = options.groupByTeam || nestTeamMembers;
  const sortBy = options.sortBy ?? 'last_name';
  if (!groupByTeam) {
    return rows.map((row) => ({
      kind: 'bowler' as const,
      key: `user:${row.user_id}`,
      row,
    }));
  }

  const teamColumns = columns.filter((c) => c.entry_unit === 'team');
  const byTeam = new Map<number, RosterSideActionSignupRow[]>();
  const unteamed: RosterSideActionSignupRow[] = [];

  for (const row of rows) {
    if (row.team_id != null && Number(row.team_id) > 0) {
      const tid = Number(row.team_id);
      const list = byTeam.get(tid) ?? [];
      list.push(row);
      byTeam.set(tid, list);
    } else {
      unteamed.push(row);
    }
  }

  const teamRows = [...byTeam.entries()].map(([teamId, members]) => {
    const teamName =
      members.find((m) => m.team_name)?.team_name || `Team ${teamId}`;
    const sortedMembers = [...members].sort((a, b) =>
      compareRosterSignupRows(a, b, sortBy === 'team_name' ? 'last_name' : sortBy)
    );
    const primary = primaryForTeam(sortedMembers, teamColumns);
    return {
      kind: 'team' as const,
      key: `team:${teamId}`,
      teamId,
      teamName,
      members: sortedMembers,
      primary,
      totalOwed: sortedMembers.reduce((s, m) => s + Number(m.total_owed || 0), 0),
      totalPaid: sortedMembers.reduce((s, m) => s + Number(m.total_paid || 0), 0),
    };
  });

  teamRows.sort((a, b) => {
    if (sortBy === 'team_name') {
      return compareTeamName(a.teamName, b.teamName);
    }
    const aLead = a.members[0];
    const bLead = b.members[0];
    if (!aLead || !bLead) return compareTeamName(a.teamName, b.teamName);
    return compareRosterSignupRows(aLead, bLead, sortBy);
  });

  const sortedUnteamed = [...unteamed].sort((a, b) =>
    compareRosterSignupRows(a, b, sortBy === 'team_name' ? 'last_name' : sortBy)
  );

  const out: RosterDisplayRow[] = [];
  for (const team of teamRows) {
    out.push(team);
    if (nestTeamMembers) {
      for (const member of team.members) {
        out.push({
          kind: 'bowler' as const,
          key: `user:${member.user_id}`,
          row: member,
          nestedUnderTeam: true,
        });
      }
    }
  }

  for (const row of sortedUnteamed) {
    out.push({
      kind: 'bowler' as const,
      key: `user:${row.user_id}`,
      row,
    });
  }

  return out;
}

