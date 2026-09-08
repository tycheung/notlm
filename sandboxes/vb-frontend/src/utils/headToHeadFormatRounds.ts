import type { EventComplete } from '../types/event';

const HEAD_TO_HEAD_METHODS = new Set([
  'round_robin',
  'bracket',
  'pods',
  'stepladder',
]);

/** Competition methods that use the Format Editor tab (H2H shells). */
export function isHeadToHeadCompetitionMethod(method: unknown): boolean {
  return HEAD_TO_HEAD_METHODS.has(String(method || '').trim().toLowerCase());
}

/** True when any event round is RR, bracket, pods, or stepladder. */
export function eventHasHeadToHeadFormatRounds(
  eventComplete?: Pick<EventComplete, 'rounds'> | null
): boolean {
  const rounds = eventComplete?.rounds;
  if (!Array.isArray(rounds) || rounds.length === 0) return false;
  return rounds.some((r) => isHeadToHeadCompetitionMethod(r?.competition_method));
}
