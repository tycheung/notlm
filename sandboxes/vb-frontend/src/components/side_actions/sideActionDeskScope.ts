import type { SideAction, SideActionPool } from '../../types/side_action';

export type DeskScopeSquad = {
  id: number;
  name: string;
  /** Games bowled on this squad (used to validate copy destinations). */
  game_count?: number;
};

export type DeskScopeRound = {
  id: number;
  round_number: number;
  friendly_name?: string | null;
  /** Round-level game count; squad.game_count takes precedence when set. */
  game_count?: number;
  squads: DeskScopeSquad[];
};

export type DeskScopeSelection = {
  roundId: number | null;
  squadId: number | null;
};

export function roundOptionLabel(round: DeskScopeRound): string {
  const name = round.friendly_name?.trim();
  return name
    ? `Round ${round.round_number}: ${name}`
    : `Round ${round.round_number}`;
}

/** Resolve the round label for a squad pool (first matching round wins). */
export function roundLabelForSquad(
  rounds: DeskScopeRound[],
  squadId: number
): string {
  const round = rounds.find((r) => r.squads.some((s) => s.id === squadId));
  return round ? roundOptionLabel(round) : '—';
}

/** Unique squads across rounds, stable by round then name. */
export function collectDeskScopeSquads(rounds: DeskScopeRound[]): DeskScopeSquad[] {
  const seen = new Set<number>();
  const out: DeskScopeSquad[] = [];
  for (const round of rounds) {
    for (const squad of round.squads) {
      if (seen.has(squad.id)) continue;
      seen.add(squad.id);
      out.push({ id: squad.id, name: squad.name || `Squad ${squad.id}` });
    }
  }
  return out;
}

export function squadIdsForRound(
  rounds: DeskScopeRound[],
  roundId: number | null
): Set<number> | null {
  if (roundId == null) return null;
  const round = rounds.find((r) => r.id === roundId);
  if (!round) return new Set();
  return new Set(round.squads.map((s) => s.id));
}

export function squadsAvailableForFilter(
  rounds: DeskScopeRound[],
  roundId: number | null
): DeskScopeSquad[] {
  const all = collectDeskScopeSquads(rounds);
  const allowed = squadIdsForRound(rounds, roundId);
  if (!allowed) return all;
  return all.filter((s) => allowed.has(s.id));
}

export function normalizeDeskScopeSelection(
  rounds: DeskScopeRound[],
  selection: DeskScopeSelection
): DeskScopeSelection {
  const roundOk =
    selection.roundId == null || rounds.some((r) => r.id === selection.roundId);
  const roundId = roundOk ? selection.roundId : null;
  const available = squadsAvailableForFilter(rounds, roundId);
  const squadOk =
    selection.squadId == null || available.some((s) => s.id === selection.squadId);
  return {
    roundId,
    squadId: squadOk ? selection.squadId : null,
  };
}

export function poolMatchesDeskScope(
  pool: SideActionPool,
  rounds: DeskScopeRound[],
  selection: DeskScopeSelection
): boolean {
  const roundSquadIds = squadIdsForRound(rounds, selection.roundId);
  if (roundSquadIds && !roundSquadIds.has(pool.squad_id)) return false;
  if (selection.squadId != null && pool.squad_id !== selection.squadId) return false;
  return true;
}

export function filterSideActionsByDeskScope(
  actions: SideAction[],
  rounds: DeskScopeRound[],
  selection: DeskScopeSelection
): SideAction[] {
  if (selection.roundId == null && selection.squadId == null) return actions;
  return actions.filter((action) =>
    action.pools.some(
      (pool) => pool.is_enabled && poolMatchesDeskScope(pool, rounds, selection)
    )
  );
}

export type BracketPoolLine = {
  action: SideAction;
  pool: SideActionPool;
};

/** One generation line per enabled squad pool (optionally scoped). */
export function buildBracketPoolLines(
  bracketActions: SideAction[],
  rounds: DeskScopeRound[],
  selection: DeskScopeSelection
): BracketPoolLine[] {
  const lines: BracketPoolLine[] = [];
  for (const action of bracketActions) {
    for (const pool of action.pools) {
      if (!pool.is_enabled) continue;
      if (!poolMatchesDeskScope(pool, rounds, selection)) continue;
      lines.push({ action, pool });
    }
  }
  return lines;
}

/** Desk filter and Copy all — only useful when there is more than one target. */
export function shouldShowDeskScopeFilter(rounds: DeskScopeRound[]): boolean {
  return rounds.length >= 2 || collectDeskScopeSquads(rounds).length >= 2;
}

export function deskScopeIsFiltered(selection: DeskScopeSelection): boolean {
  return selection.roundId != null || selection.squadId != null;
}

export function findDeskScopeSquad(
  rounds: DeskScopeRound[],
  squadId: number
): DeskScopeSquad | null {
  for (const round of rounds) {
    const match = round.squads.find((s) => s.id === squadId);
    if (match) {
      const gameCount =
        match.game_count != null && match.game_count > 0
          ? match.game_count
          : round.game_count != null && round.game_count > 0
            ? round.game_count
            : undefined;
      return gameCount != null ? { ...match, game_count: gameCount } : match;
    }
  }
  return null;
}

/** Effective game count for a destination squad (falls back to round). */
export function destinationGameCount(
  rounds: DeskScopeRound[],
  squadId: number
): number | null {
  const squad = findDeskScopeSquad(rounds, squadId);
  if (squad?.game_count != null && squad.game_count > 0) {
    return Math.max(1, squad.game_count);
  }
  return null;
}
