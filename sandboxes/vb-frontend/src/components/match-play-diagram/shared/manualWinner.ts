import type { DiagramMatch, DiagramParticipant } from '../adapters/types';

/** Sum scratch scores that have a value for one diagram side. */
export function sideScoreTotal(participant: DiagramParticipant): number | null {
  const scored = participant.scores.filter((s) => s.score != null && Number.isFinite(s.score));
  if (scored.length === 0) return null;
  return scored.reduce((sum, s) => sum + Number(s.score), 0);
}

/**
 * Show pick-winner when both sides are present, no winner yet, and pinfall is tied
 * (or status is in_progress with equal game wins after both sides have scores).
 */
export function matchNeedsManualWinner(match: DiagramMatch): boolean {
  if (match.winnerSide != null) return false;
  const [a, b] = match.participants;
  if (a.isTbd || b.isTbd) return false;
  const totalA = sideScoreTotal(a);
  const totalB = sideScoreTotal(b);
  if (totalA == null || totalB == null) return false;
  if (totalA === totalB) return true;
  // Race-to stall: equal game wins with scoring underway, still no series winner.
  if (
    match.winsSide0 === match.winsSide1 &&
    match.winsSide0 > 0 &&
    String(match.status || '').toLowerCase() === 'in_progress'
  ) {
    return true;
  }
  return false;
}
