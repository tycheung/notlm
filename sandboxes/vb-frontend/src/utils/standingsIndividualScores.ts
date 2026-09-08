import { pickRoundGameScoring } from './roundGameScoring';

/** Round-like input used to decide Baker vs standard for standings options. */
export type StandingsRoundGameStyleInput = {
  competition_method_config?: Record<string, unknown> | null;
  game_style?: string | null;
};

export function isBakerStandingsRound(
  round: StandingsRoundGameStyleInput | null | undefined
): boolean {
  if (!round) return false;
  if (round.game_style != null && String(round.game_style).trim() !== '') {
    return String(round.game_style).toLowerCase() === 'baker';
  }
  return pickRoundGameScoring(round.competition_method_config).game_style === 'baker';
}

/**
 * Baker-only when every known round is Baker.
 * Empty list is not Baker-only (unknown / no team rounds to judge).
 */
export function isBakerOnlyStandingsRounds(
  rounds: StandingsRoundGameStyleInput[] | null | undefined
): boolean {
  const list = rounds || [];
  if (list.length === 0) return false;
  return list.every((round) => isBakerStandingsRound(round));
}

/** Individual team scores are useful only when some non-Baker round exists. */
export function allowIndividualTeamScoresForRounds(
  rounds: StandingsRoundGameStyleInput[] | null | undefined
): boolean {
  return !isBakerOnlyStandingsRounds(rounds);
}
