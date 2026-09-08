import type { CompetitionMethod } from '../types';

export type BracketMode = 'single_elimination' | 'double_elimination';

type RoundLike = {
  id?: number | null;
  competition_method?: string | null;
  competition_method_config?: Record<string, unknown> | null;
};

export function getSelectedRoundCompetitionMethod(
  rounds: RoundLike[] | null | undefined,
  selectedRoundId: number | null | undefined
): CompetitionMethod {
  if (!selectedRoundId || !Array.isArray(rounds)) return 'eliminator';
  const selectedRound = rounds.find((r) => Number(r?.id) === Number(selectedRoundId));
  const method = String(selectedRound?.competition_method || 'eliminator').toLowerCase();
  if (method === 'bracket') return 'bracket';
  if (method === 'stepladder') return 'stepladder';
  if (method === 'round_robin') return 'round_robin';
  if (method === 'pods') return 'pods';
  return 'eliminator';
}

export function getSelectedRoundBracketMode(
  rounds: RoundLike[] | null | undefined,
  selectedRoundId: number | null | undefined
): BracketMode | null {
  if (!selectedRoundId || !Array.isArray(rounds)) return null;
  const selectedRound = rounds.find((r) => Number(r?.id) === Number(selectedRoundId));
  const cfg = (selectedRound?.competition_method_config || {}) as Record<string, unknown>;
  const m = String(cfg.bracket_mode || 'single_elimination').toLowerCase();
  return m === 'double_elimination' ? 'double_elimination' : 'single_elimination';
}

export function getSelectedRoundPodSize(
  rounds: RoundLike[] | null | undefined,
  selectedRoundId: number | null | undefined
): number | null {
  if (!selectedRoundId || !Array.isArray(rounds)) return null;
  const selectedRound = rounds.find((r) => Number(r?.id) === Number(selectedRoundId));
  const cfg = (selectedRound?.competition_method_config || {}) as Record<string, unknown>;
  const raw = Number(cfg.pod_size ?? 0);
  if (!Number.isFinite(raw) || raw < 2) return null;
  return raw;
}

export function getSelectedRoundPositionRoundGame(
  rounds: RoundLike[] | null | undefined,
  selectedRoundId: number | null | undefined
): number | null {
  if (!selectedRoundId || !Array.isArray(rounds)) return null;
  const selectedRound = rounds.find((r) => Number(r?.id) === Number(selectedRoundId));
  const cfg = (selectedRound?.competition_method_config || {}) as Record<string, unknown>;
  const raw = Number(cfg.position_round_game ?? 0);
  if (!Number.isFinite(raw) || raw < 1) return null;
  return raw;
}

export function getSelectedRoundScheduledGames(
  rounds: RoundLike[] | null | undefined,
  selectedRoundId: number | null | undefined
): number | null {
  if (!selectedRoundId || !Array.isArray(rounds)) return null;
  const selectedRound = rounds.find((r) => Number(r?.id) === Number(selectedRoundId));
  const cfg = (selectedRound?.competition_method_config || {}) as Record<string, unknown>;
  const raw = Number(
    cfg.scheduled_games ?? cfg.total_matches_or_games ?? 0
  );
  if (!Number.isFinite(raw) || raw < 1) return null;
  return raw;
}
