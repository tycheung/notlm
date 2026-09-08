/**
 * Client-side Eliminator cut projection (mirrors backend services/eliminator/math.py).
 *
 * Percentage drops use original entry count each cut (not shrinking alive field).
 */
import { normalizeGameNumbers } from '../features/side-actions/shared/gamePlan';

export type EliminatorDropMode = 'percentage' | 'flat';
export type EliminatorRoundMode = 'up' | 'down';
export type EliminatorDropSchedule = 'uniform' | 'varied';

export type EliminatorProjectionStep = {
  game_number: number;
  role: 'cut' | 'payout';
  starting_alive: number;
  dropped: number;
  surviving: number;
  drop_amount: number;
};

export type EliminatorProjection = {
  entry_count: number;
  game_numbers: number[];
  drop_mode: EliminatorDropMode;
  drop_amount: number;
  drop_schedule: EliminatorDropSchedule;
  drop_amounts_by_game: Record<string, number>;
  round_mode: EliminatorRoundMode | null;
  steps: EliminatorProjectionStep[];
  final_alive: number;
  payout_game: number;
  zero_at_final: boolean;
  emptied_before_final: boolean;
  has_warning: boolean;
};

export function cutGamesFromStages(gameNumbers: number[]): number[] {
  const ordered = normalizeGameNumbers(gameNumbers);
  return ordered.length > 1 ? ordered.slice(0, -1) : [];
}

export function syncDropAmountsByGame(
  cutGames: number[],
  existing: Record<string, number> | undefined,
  defaultAmount: number
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const game of cutGames) {
    const key = String(game);
    const prior = existing?.[key];
    next[key] = Number.isFinite(prior) ? Number(prior) : defaultAmount;
  }
  return next;
}

export function resolveDropAmountForGame(
  gameNumber: number,
  input: {
    dropAmount: number;
    dropSchedule?: EliminatorDropSchedule;
    dropAmountsByGame?: Record<string, number>;
  }
): number {
  if (input.dropSchedule !== 'varied') return Number(input.dropAmount) || 0;
  const keyed = input.dropAmountsByGame?.[String(gameNumber)];
  if (keyed != null && Number.isFinite(Number(keyed))) return Number(keyed);
  return Number(input.dropAmount) || 0;
}

export function computeDropCount(
  alive: number,
  dropMode: EliminatorDropMode,
  dropAmount: number,
  roundMode: EliminatorRoundMode = 'down',
  entryCount?: number
): number {
  const field = Math.max(0, Math.floor(alive));
  if (field <= 0) return 0;
  if (dropMode === 'flat') {
    return Math.min(field, Math.max(0, Math.floor(dropAmount)));
  }
  const base = Math.max(
    0,
    Math.floor(entryCount != null ? entryCount : field)
  );
  const raw = base * (Math.max(0, dropAmount) / 100);
  const drop =
    roundMode === 'up' ? Math.ceil(raw - 1e-12) : Math.floor(raw + 1e-12);
  return Math.min(field, Math.max(0, drop));
}

export function projectCutSchedule(input: {
  entryCount: number;
  gameNumbers: number[];
  dropMode: EliminatorDropMode;
  dropAmount: number;
  roundMode?: EliminatorRoundMode;
  dropSchedule?: EliminatorDropSchedule;
  dropAmountsByGame?: Record<string, number>;
}): EliminatorProjection {
  const gameNumbers = normalizeGameNumbers(input.gameNumbers);
  const length = gameNumbers.length;
  const cutGames = length > 1 ? gameNumbers.slice(0, -1) : [];
  const payoutGame = gameNumbers[gameNumbers.length - 1];
  const roundMode = input.roundMode ?? 'down';
  const schedule: EliminatorDropSchedule =
    input.dropSchedule === 'varied' ? 'varied' : 'uniform';
  const amountsByGame =
    schedule === 'varied'
      ? syncDropAmountsByGame(cutGames, input.dropAmountsByGame, input.dropAmount)
      : {};
  const entries = Math.max(0, Math.floor(input.entryCount));

  let alive = entries;
  const steps: EliminatorProjectionStep[] = [];
  let emptiedBeforeFinal = false;

  for (const gnum of cutGames) {
    const startingAlive = alive;
    const amount = resolveDropAmountForGame(gnum, {
      dropAmount: input.dropAmount,
      dropSchedule: schedule,
      dropAmountsByGame: amountsByGame,
    });
    const dropped = computeDropCount(
      alive,
      input.dropMode,
      amount,
      roundMode,
      entries
    );
    alive = Math.max(0, alive - dropped);
    if (alive <= 0) emptiedBeforeFinal = true;
    steps.push({
      game_number: gnum,
      role: 'cut',
      starting_alive: startingAlive,
      dropped,
      surviving: alive,
      drop_amount: amount,
    });
  }

  steps.push({
    game_number: payoutGame,
    role: 'payout',
    starting_alive: alive,
    dropped: 0,
    surviving: alive,
    drop_amount: 0,
  });

  const zeroAtFinal = alive <= 0;
  return {
    entry_count: entries,
    game_numbers: gameNumbers,
    drop_mode: input.dropMode,
    drop_amount: input.dropAmount,
    drop_schedule: schedule,
    drop_amounts_by_game: amountsByGame,
    round_mode: input.dropMode === 'percentage' ? roundMode : null,
    steps,
    final_alive: alive,
    payout_game: payoutGame,
    zero_at_final: zeroAtFinal,
    emptied_before_final: emptiedBeforeFinal,
    has_warning: zeroAtFinal || emptiedBeforeFinal,
  };
}

export function eliminatorProjectionWarning(
  projection: EliminatorProjection
): string | null {
  if (projection.emptied_before_final) {
    return 'This cut schedule eliminates everyone before the final (payout) game. Reduce drops, switch round mode, or shorten the eliminator.';
  }
  if (projection.zero_at_final) {
    return 'No bowlers remain for the final (payout) game with the current entry count and cut settings.';
  }
  return null;
}

export function formatEliminatorDropLabel(input: {
  dropMode?: EliminatorDropMode | string;
  dropAmount?: number;
  dropSchedule?: EliminatorDropSchedule | string;
  roundMode?: EliminatorRoundMode | string | null;
}): string {
  if (input.dropSchedule === 'varied') {
    return input.dropMode === 'flat' ? 'Varies by game (flat)' : 'Varies by game (%)';
  }
  const amount = Number(input.dropAmount ?? 50);
  if (input.dropMode === 'flat') return `${amount} flat each cut`;
  const round = input.roundMode || 'down';
  return `${amount}% of entries (${round}) each cut`;
}
