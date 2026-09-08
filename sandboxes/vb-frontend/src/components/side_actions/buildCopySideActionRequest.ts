import type { CreateSideActionRequest, SideAction } from '../../types/side_action';

export type CopySideActionTarget = {
  name: string;
  squadId: number;
};

/** Games that will be written on the copied pot. */
export function gameNumbersForSideAction(source: SideAction): number[] {
  const fromConfig = (source.type_config as { game_numbers?: number[] } | null)
    ?.game_numbers;
  const raw =
    Array.isArray(fromConfig) && fromConfig.length > 0
      ? fromConfig
      : (source.game_numbers ?? []);
  return [...new Set(raw.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 1))].sort(
    (a, b) => a - b
  );
}

/**
 * Clear error when destination squad does not include the source's selected games
 * (e.g. games 2–4 onto a 3-game squad).
 */
export function copyGamesFitError(
  source: SideAction,
  destination: { name: string; gameCount: number }
): string | null {
  const games = gameNumbersForSideAction(source);
  if (games.length === 0) return null;
  const maxGame = Math.max(1, destination.gameCount);
  const missing = games.filter((g) => g > maxGame);
  if (missing.length === 0) return null;
  const missingLabel = missing.join(', ');
  const rangeLabel =
    maxGame === 1 ? 'game 1' : `games 1–${maxGame}`;
  return (
    `Cannot copy “${source.name.trim() || 'Side action'}” — it uses game${
      missing.length === 1 ? '' : 's'
    } ${missingLabel}, which do not exist on “${destination.name}” ` +
    `(that squad only has ${rangeLabel}).`
  );
}

export function assertCopyGamesFitDestination(
  source: SideAction,
  destination: { name: string; gameCount: number }
): void {
  const message = copyGamesFitError(source, destination);
  if (message) throw new Error(message);
}

/** Validate every action before bulk copy so we do not create a partial set. */
export function assertAllCopyGamesFitDestination(
  actions: SideAction[],
  destination: { name: string; gameCount: number }
): void {
  for (const action of actions) {
    assertCopyGamesFitDestination(action, destination);
  }
}

/** Default copy name — editable in the single-copy modal. */
export function defaultCopySideActionName(sourceName: string): string {
  const trimmed = sourceName.trim() || 'Side action';
  if (/\(copy\)$/i.test(trimmed)) return trimmed;
  return `${trimmed} (copy)`;
}

/**
 * Bulk copy naming: keep the original name on a different squad; append (copy)
 * when cloning onto the same squad so the list stays distinguishable.
 */
export function bulkCopySideActionName(
  sourceName: string,
  options: {
    destinationSquadId: number;
    sourceSquadIds: number[];
  }
): string {
  const { destinationSquadId, sourceSquadIds } = options;
  const trimmed = sourceName.trim() || 'Side action';
  const sameSquadOnly =
    sourceSquadIds.length > 0 &&
    sourceSquadIds.every((id) => id === destinationSquadId);
  if (sameSquadOnly) {
    return defaultCopySideActionName(trimmed);
  }
  return trimmed;
}

/**
 * Build a create payload that clones shared settings onto one selected squad.
 * Per-squad overrides are never copied — destination uses the shared config only.
 */
export function buildCopySideActionRequest(
  source: SideAction,
  target: CopySideActionTarget
): CreateSideActionRequest {
  const name = target.name.trim();
  if (!name) {
    throw new Error('Name is required');
  }
  if (!Number.isFinite(target.squadId) || target.squadId <= 0) {
    throw new Error('Choose a destination squad');
  }

  return {
    name,
    tournament_id: source.tournament_id,
    event_id: source.event_id,
    side_action_type: source.side_action_type,
    description: source.description,
    entry_fee: source.entry_fee,
    max_participants: source.max_participants,
    house_cut_percentage: source.house_cut_percentage,
    house_cut_amount: source.house_cut_amount ?? null,
    house_cut_type: source.house_cut_type,
    game_numbers: [...(source.game_numbers ?? [])],
    squad_scope_mode: 'selected',
    selected_squad_ids: [target.squadId],
    pool_overrides: {},
    check_in_required: source.check_in_required,
    type_config: { ...(source.type_config ?? {}) },
    prize_distribution: { ...(source.prize_distribution ?? {}) },
    prize_type: source.prize_type,
    custom_payout_structure: source.custom_payout_structure ?? null,
  };
}

export function enabledSquadIdsForSideAction(source: SideAction): number[] {
  return source.pools.filter((p) => p.is_enabled).map((p) => p.squad_id);
}
