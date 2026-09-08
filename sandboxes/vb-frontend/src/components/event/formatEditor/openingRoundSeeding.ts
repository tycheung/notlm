import type { BracketSeedMode } from './bracketMatchupsUtils';
import type { PodsBalanceMode } from './podsMatchupsUtils';

/** Modes that need feeder standings / averages — not valid on an opening (no-qualifying) round. */
export const STANDINGS_BASED_BRACKET_SEED_MODES: BracketSeedMode[] = ['by_seed'];
export const STANDINGS_BASED_PODS_BALANCE_MODES: PodsBalanceMode[] = ['by_seed'];

export const OPENING_ROUND_BRACKET_SEED_MODES: BracketSeedMode[] = ['random', 'manual'];
export const OPENING_ROUND_PODS_BALANCE_MODES: PodsBalanceMode[] = ['random', 'manual'];

export function roundHasIncomingFeeder(
  roundId: number | null | undefined,
  relationships: Array<{ target_round_id?: number | null } | Record<string, unknown>> | null | undefined
): boolean {
  if (roundId == null || !relationships?.length) return false;
  const id = Number(roundId);
  if (!Number.isFinite(id) || id <= 0) return false;
  return relationships.some((rel) => Number(rel.target_round_id) === id);
}

export function roundRefHasIncomingFeeder(
  roundRef: string | null | undefined,
  relationships: Array<{ target_ref?: unknown } | Record<string, unknown>> | null | undefined
): boolean {
  const ref = String(roundRef ?? '').trim();
  if (!ref || !relationships?.length) return false;
  return relationships.some((rel) => String(rel.target_ref ?? '').trim() === ref);
}

/**
 * Opening bracket/pods rounds (no qualifying feeder) may only use random or manual placement.
 */
export function allowsStandingsBasedSeeding(opts: {
  isInitialRound?: boolean | null;
  hasIncomingFeeder?: boolean | null;
}): boolean {
  if (opts.hasIncomingFeeder === true) return true;
  if (opts.isInitialRound === true) return false;
  if (opts.hasIncomingFeeder === false) return false;
  // Unknown readiness: allow standings-based (safer for mid-event with feeder).
  return true;
}

export function coerceBracketSeedModeForOpening(
  mode: BracketSeedMode,
  allowStandingsBased: boolean
): BracketSeedMode {
  if (allowStandingsBased) return mode;
  if (mode === 'by_seed') return 'random';
  return mode;
}

export function coercePodsBalanceModeForOpening(
  mode: PodsBalanceMode | string,
  allowStandingsBased: boolean
): PodsBalanceMode {
  const normalized: PodsBalanceMode =
    mode === 'by_average' || mode === 'by_seed'
      ? 'by_seed'
      : mode === 'manual' || mode === 'random'
        ? mode
        : 'by_seed';
  if (allowStandingsBased) return normalized;
  if (normalized === 'by_seed') return 'random';
  return normalized;
}
