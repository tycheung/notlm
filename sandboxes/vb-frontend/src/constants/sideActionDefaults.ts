import { SideActionType } from '../types/side_action';
import { getDefaultBracketPrizeAmounts, getMaxBracketPayoutSpots } from '../utils/sideActionPayouts';

export const DEFAULT_SIDE_ACTION_ENTRY_FEE = 5;
export const DEFAULT_SIDE_ACTION_MAX_PARTICIPANTS = 8;
export const DEFAULT_SIDE_ACTION_NUM_GAMES = 3;
export const DEFAULT_SIDE_ACTION_STARTING_GAME = 1;
export const DEFAULT_YOUTH_MAX_AGE = 17;
export const DEFAULT_SENIOR_MIN_AGE = 50;

/** Flat house fees per bracket pot — defaults to one entry fee ($5 on a $5 bracket). */
export const defaultHouseCutPerPot = (entryFee = DEFAULT_SIDE_ACTION_ENTRY_FEE) => entryFee;

export type SideActionHandicapDefaults = {
  base_score?: number;
  percentage?: number;
};

export const defaultEligibilityTypeFields = () => ({
  divisions: { men: true, women: true },
  age_classes: { youth: true, open: true, senior: true },
  youth_max_age: DEFAULT_YOUTH_MAX_AGE,
  senior_min_age: DEFAULT_SENIOR_MIN_AGE,
});

export const defaultHandicapSourceFields = (eventHandicap?: SideActionHandicapDefaults) => ({
  handicap_source: 'event_default' as const,
  handicap_base_score: eventHandicap?.base_score ?? 200,
  handicap_percentage: eventHandicap?.percentage ?? 90,
});

export const gameNumbersForEvent = (eventGameCount: number, cap?: number) =>
  Array.from(
    { length: Math.max(1, cap ?? eventGameCount) },
    (_, index) => index + 1
  );

export const defaultBracketTypeConfig = (eventHandicap?: SideActionHandicapDefaults) => ({
  participant_count: DEFAULT_SIDE_ACTION_MAX_PARTICIPANTS,
  bye_handling: 'none' as const,
  specific_brackets: 0,
  tiebreaker_method: 'both_advance' as const,
  final_tie_splits_prize: true,
  round_count: 3,
  game_order: 'forward' as const,
  handicap_mode: 'handicap' as const,
  ...defaultHandicapSourceFields(eventHandicap),
  ...defaultEligibilityTypeFields(),
  /** Place prizes + fee for (slots-1) seated pots; default keeps 1st/2nd, fee $0. */
  bye_prize_distribution: defaultByePrizeDistributionForBracket(
    DEFAULT_SIDE_ACTION_MAX_PARTICIPANTS
  ),
});

export const defaultHighGameTypeConfig = (
  eventHandicap?: SideActionHandicapDefaults,
  eventGameCount = DEFAULT_SIDE_ACTION_NUM_GAMES
) => ({
  handicap_mode: 'handicap' as const,
  ...defaultHandicapSourceFields(eventHandicap),
  game_numbers: gameNumbersForEvent(eventGameCount),
  payout_mode: 'per_game' as const,
  ...defaultEligibilityTypeFields(),
});

export const defaultHighSetTypeConfig = (
  eventHandicap?: SideActionHandicapDefaults,
  eventGameCount = DEFAULT_SIDE_ACTION_NUM_GAMES
) => ({
  handicap_mode: 'scratch' as const,
  ...defaultHandicapSourceFields(eventHandicap),
  game_numbers: gameNumbersForEvent(eventGameCount),
  ...defaultEligibilityTypeFields(),
});

export const defaultEliminatorTypeConfig = (
  eventHandicap?: SideActionHandicapDefaults,
  eventGameCount = DEFAULT_SIDE_ACTION_NUM_GAMES
) => ({
  game_numbers: gameNumbersForEvent(
    eventGameCount,
    Math.min(3, Math.max(1, eventGameCount))
  ),
  drop_mode: 'percentage' as const,
  drop_amount: 50,
  drop_schedule: 'uniform' as const,
  drop_amounts_by_game: {},
  round_mode: 'down' as const,
  handicap_mode: 'handicap' as const,
  ...defaultHandicapSourceFields(eventHandicap),
  ...defaultEligibilityTypeFields(),
});

export const defaultMysteryDoublesTypeConfig = (
  eventHandicap?: SideActionHandicapDefaults
) => ({
  handicap_mode: 'handicap' as const,
  ...defaultHandicapSourceFields(eventHandicap),
  game_numbers: [1],
  odd_entrant_policy: 'block_until_even' as const,
  pair_score_mode: 'sum' as const,
  ...defaultEligibilityTypeFields(),
});

export const defaultMysteryGameTypeConfig = (
  eventHandicap?: SideActionHandicapDefaults
) => ({
  handicap_mode: 'scratch' as const,
  ...defaultHandicapSourceFields(eventHandicap),
  game_numbers: [1],
  game_scope: 'single' as const,
  min_mystery_score: 0,
  max_mystery_score: 300,
  no_match_policy: 'closest' as const,
  entry_unit: 'bowler' as const,
  ...defaultEligibilityTypeFields(),
});

export const defaultLoveDoublesTypeConfig = (
  eventHandicap?: SideActionHandicapDefaults
) => ({
  handicap_mode: 'handicap' as const,
  ...defaultHandicapSourceFields(eventHandicap),
  game_numbers: [1],
  pair_score_mode: 'sum' as const,
  entry_unit: 'bowler' as const,
  ...defaultEligibilityTypeFields(),
});

export const defaultAlibiDoublesTypeConfig = (
  eventHandicap?: SideActionHandicapDefaults
) => ({
  handicap_mode: 'handicap' as const,
  ...defaultHandicapSourceFields(eventHandicap),
  game_numbers: [1],
  pair_score_mode: 'sum' as const,
  entry_unit: 'bowler' as const,
  max_pairs_per_bowler: null,
  allow_cross_squad: false,
  pair_require_mixed_gender: false,
  pair_require_over_under: false,
  ...defaultEligibilityTypeFields(),
});

export const defaultTypeConfigForSideAction = (
  sideActionType: SideActionType,
  eventHandicap?: SideActionHandicapDefaults,
  eventGameCount = DEFAULT_SIDE_ACTION_NUM_GAMES
): Record<string, unknown> => {
  switch (sideActionType) {
    case SideActionType.BRACKET:
      return { ...defaultBracketTypeConfig(eventHandicap) };
    case SideActionType.HIGH_GAME:
      return { ...defaultHighGameTypeConfig(eventHandicap, eventGameCount) };
    case SideActionType.HIGH_SET:
      return { ...defaultHighSetTypeConfig(eventHandicap, eventGameCount) };
    case SideActionType.ELIMINATOR:
      return { ...defaultEliminatorTypeConfig(eventHandicap, eventGameCount) };
    case SideActionType.MYSTERY_DOUBLES:
      return { ...defaultMysteryDoublesTypeConfig(eventHandicap) };
    case SideActionType.MYSTERY_GAME:
      return { ...defaultMysteryGameTypeConfig(eventHandicap) };
    case SideActionType.LOVE_DOUBLES:
      return { ...defaultLoveDoublesTypeConfig(eventHandicap) };
    case SideActionType.ALIBI_DOUBLES:
      return { ...defaultAlibiDoublesTypeConfig(eventHandicap) };
    default:
      return {};
  }
};

export const seedBracketTypeConfig = (
  base: Record<string, unknown>,
  maxParticipants = DEFAULT_SIDE_ACTION_MAX_PARTICIPANTS
): Record<string, unknown> => {
  const typeConfig = { ...base };
  if (!typeConfig.bye_prize_distribution) {
    typeConfig.bye_prize_distribution = defaultByePrizeDistributionForBracket(
      maxParticipants
    );
  }
  return typeConfig;
};

export const defaultPrizeDistributionForSideAction = (
  sideActionType: SideActionType,
  maxParticipants = DEFAULT_SIDE_ACTION_MAX_PARTICIPANTS,
  entryFee = DEFAULT_SIDE_ACTION_ENTRY_FEE
): Record<string, number> => {
  if (sideActionType === SideActionType.BRACKET) {
    const spots = getMaxBracketPayoutSpots(maxParticipants);
    const amounts = getDefaultBracketPrizeAmounts(spots);
    const distribution: Record<string, number> = {};
    amounts.forEach((amount, index) => {
      distribution[String(index + 1)] = amount;
    });
    distribution.fee = defaultHouseCutPerPot(entryFee);
    return distribution;
  }
  if (sideActionType === SideActionType.MYSTERY_GAME) {
    return { '1': 100 };
  }
  return { '1': 50, '2': 30, '3': 20 };
};

/** Bye pot: same place prizes as full; fee $0 (missing entry comes from fees). */
export const defaultByePrizeDistributionForBracket = (
  maxParticipants = DEFAULT_SIDE_ACTION_MAX_PARTICIPANTS
): Record<string, number> => {
  const spots = getMaxBracketPayoutSpots(maxParticipants);
  const amounts = getDefaultBracketPrizeAmounts(spots);
  const distribution: Record<string, number> = {};
  amounts.forEach((amount, index) => {
    distribution[String(index + 1)] = amount;
  });
  distribution.fee = 0;
  return distribution;
};

export const buildDefaultCreateSideActionFields = (
  sideActionType: SideActionType = SideActionType.BRACKET,
  maxParticipants = DEFAULT_SIDE_ACTION_MAX_PARTICIPANTS
) => ({
  entry_fee: DEFAULT_SIDE_ACTION_ENTRY_FEE,
  max_participants: maxParticipants,
  check_in_required: false,
  house_cut_percentage: 0,
  house_cut_amount: defaultHouseCutPerPot(DEFAULT_SIDE_ACTION_ENTRY_FEE),
  house_cut_type: 'amount' as const,
  prize_type: 'amount' as const,
  prize_distribution: defaultPrizeDistributionForSideAction(sideActionType, maxParticipants),
  custom_payout_structure: null as string | null,
});
