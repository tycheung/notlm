export enum ScoreType {
  // Existing values
  SCRATCH = 'scratch',
  HANDICAP = 'handicap',
  BOTH = 'both',
  
  // New values from backend
  TOTAL_PINFALL = 'total_pin_fall',
  MANUAL = 'manual',
  BAKER = 'baker',
  MATCH_PLAY = 'match_play',
}

export enum TiebreakerRule {
  // Existing values
  HIGHEST_GAME = 'highest_game',
  LAST_GAME = 'last_game',
  ROLLOFF = 'rolloff',
  NONE = 'none',
  
  // New values from backend
  MANUAL = 'manual',
  HIGHEST_LAST_GAME = 'highest_last_game',
  HEAD_TO_HEAD = 'head_to_head'
}

export enum RoundStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/** Match series terminal state (backend uses "complete", not "completed"). */
export enum MatchSeriesStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
}

export enum AdvancementType {
  HIGHEST_AVERAGE = 'highest_average',
  HIGHEST_HANDICAP_AVERAGE = 'highest_handicap_average',
  HIGHEST_SINGLE_GAME = 'highest_single_game',
  HIGHEST_SCRATCH_GAME = 'highest_scratch_game',
  HIGHEST_HANDICAP_GAME = 'highest_handicap_game',
  TOTAL_PINFALL = 'total_pinfall',
  TOTAL_PINFALL_WITH_BONUS = 'total_pinfall_with_bonus',
  MATCH_WINNERS = 'match_winners',
  ELIMINATION_ORDER = 'elimination_order',
  CUSTOM = 'custom'
}

/** Default ranking/criteria for new round relationship (flow arrow) links. */
export const DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE = AdvancementType.TOTAL_PINFALL;

/** Criteria suited to stepladder / bracket / pods finishes. */
export const H2H_DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE =
  AdvancementType.ELIMINATION_ORDER;

export const RELATIONSHIP_ADVANCEMENT_TYPES: Array<{
  value: AdvancementType;
  label: string;
}> = [
  { value: AdvancementType.TOTAL_PINFALL, label: 'Total Pinfall' },
  {
    value: AdvancementType.TOTAL_PINFALL_WITH_BONUS,
    label: 'Total Pinfall with Bonus Pins',
  },
  { value: AdvancementType.HIGHEST_AVERAGE, label: 'Highest Average' },
  { value: AdvancementType.HIGHEST_HANDICAP_AVERAGE, label: 'Highest Handicap Average' },
  { value: AdvancementType.HIGHEST_SINGLE_GAME, label: 'Highest Single Game' },
  { value: AdvancementType.HIGHEST_SCRATCH_GAME, label: 'Highest Scratch Game' },
  { value: AdvancementType.HIGHEST_HANDICAP_GAME, label: 'Highest Handicap Game' },
  { value: AdvancementType.MATCH_WINNERS, label: 'Match winners (bracket / race-to)' },
  {
    value: AdvancementType.ELIMINATION_ORDER,
    label: 'Elimination Order',
  },
];

export const ADVANCEMENT_SCORE_BASIS_OPTIONS: Array<{
  value: '' | 'scratch' | 'handicap';
  label: string;
}> = [
  { value: '', label: 'Default (handicap totals)' },
  { value: 'handicap', label: 'Handicap totals' },
  { value: 'scratch', label: 'Scratch pinfall' },
];

export type AdvancementScoreScope = 'source_round' | 'all_rounds';

export const ADVANCEMENT_SCORE_SCOPE_OPTIONS: Array<{
  value: AdvancementScoreScope;
  label: string;
  hint: string;
}> = [
  {
    value: 'source_round',
    label: 'Source round only',
    hint: 'Rank and pay using totals from the linked source round (e.g. pod 2 game only).',
  },
  {
    value: 'all_rounds',
    label: 'All rounds (event total)',
    hint: 'Sum every scored game in the event (qualifying + all pods) for final order and payout.',
  },
];

const SCORE_SCOPE_ADVANCEMENT_TYPES = new Set<string>([
  AdvancementType.TOTAL_PINFALL,
  AdvancementType.TOTAL_PINFALL_WITH_BONUS,
  AdvancementType.HIGHEST_AVERAGE,
  AdvancementType.HIGHEST_HANDICAP_AVERAGE,
  AdvancementType.HIGHEST_SINGLE_GAME,
  AdvancementType.HIGHEST_SCRATCH_GAME,
  AdvancementType.HIGHEST_HANDICAP_GAME,
]);

export function advancementTypeSupportsScoreScope(advancementType: string | undefined | null): boolean {
  const key = String(advancementType || AdvancementType.TOTAL_PINFALL).trim();
  return SCORE_SCOPE_ADVANCEMENT_TYPES.has(key);
}

export const RELATIONSHIP_TIEBREAKER_RULES: Array<{
  value: string;
  label: string;
}> = [
  { value: TiebreakerRule.HIGHEST_GAME, label: 'Highest Game' },
  { value: TiebreakerRule.HIGHEST_LAST_GAME, label: 'Highest Last Game' },
  { value: TiebreakerRule.HEAD_TO_HEAD, label: 'Head to Head' },
  { value: TiebreakerRule.MANUAL, label: 'Manual Decision' },
];