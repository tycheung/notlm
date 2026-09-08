import type { MysteryGameStandingsPool } from '../../../types/side_action';

export type OutcomeKind =
  | 'exact_match'
  | 'closest'
  | 'needs_respin'
  | 'no_scores'
  | 'pending'
  | 'unknown';

export function normalizeOutcome(raw?: string | null): OutcomeKind {
  switch (raw) {
    case 'exact_match':
    case 'closest':
    case 'needs_respin':
    case 'no_scores':
      return raw;
    default:
      return 'unknown';
  }
}

export function spinCardTone(outcome: OutcomeKind): string {
  switch (outcome) {
    case 'exact_match':
      return 'border-success/60 from-success/10 to-surface';
    case 'closest':
      return 'border-accent/60 from-accent/10 to-surface';
    case 'needs_respin':
      return 'border-pending/70 from-pending/10 to-surface';
    case 'no_scores':
      return 'border-danger/50 from-danger/10 to-surface';
    default:
      return 'border-border from-surface-light to-surface';
  }
}

export function winnerNames(pool: MysteryGameStandingsPool): string[] {
  return (pool.winners ?? [])
    .filter((winner) => winner.user_id != null)
    .map((winner) => String(winner.display_name || `User ${winner.user_id}`));
}

export function formatMysteryScore(score: number): string {
  const rounded = Math.round(score);
  return Math.abs(score - rounded) < 0.01 ? String(rounded) : score.toFixed(1);
}

export function winnerScoreDetails(pool: MysteryGameStandingsPool): string {
  return (pool.winners ?? [])
    .filter((winner) => winner.user_id != null)
    .map((winner) => {
      const name = String(winner.display_name || `User ${winner.user_id}`);
      const score =
        winner.score != null ? formatMysteryScore(Number(winner.score)) : '?';
      const game =
        winner.game_number != null ? ` on game ${winner.game_number}` : '';
      return `${name} scored ${score}${game}`;
    })
    .join('; ');
}

export function poolTargetLabel(
  pools: MysteryGameStandingsPool[]
): string | number | null {
  const targets = pools
    .map((pool) => pool.target_score)
    .filter((target): target is number => target != null);
  if (!targets.length) return null;
  const unique = new Set(targets);
  if (unique.size === 1) return targets[0];
  return null;
}

export function sortRowsForDisplay(pool: MysteryGameStandingsPool) {
  if (!pool.spun) return pool.rows;
  return [...pool.rows].sort((left, right) => {
    if (left.is_winner !== right.is_winner) {
      return left.is_winner ? -1 : 1;
    }
    const leftDistance = left.distance ?? Number.POSITIVE_INFINITY;
    const rightDistance = right.distance ?? Number.POSITIVE_INFINITY;
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    return right.score - left.score || left.user_id - right.user_id;
  });
}
