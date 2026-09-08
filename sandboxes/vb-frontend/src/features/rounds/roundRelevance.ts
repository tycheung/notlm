import { RoundRealTimeStatus } from '../../api/rounds';
import { parseNaiveDateTimeToDate } from '../../utils/dateUtils';

type RoundLike = {
  id: number;
  round_number?: number;
};

type SquadLike = {
  round_id: number;
  start_datetime?: string | null;
};

type RoundStatusMap = Record<number, RoundRealTimeStatus | undefined> | null | undefined;

type RankedRound = {
  round: RoundLike;
  earliestStartTime: Date;
  isCompleted: boolean;
  isInProgress: boolean;
  isUpcoming: boolean;
};

export type MostRelevantRoundReason =
  | 'in_progress'
  | 'upcoming'
  | 'first_incomplete'
  | 'all_completed_fallback'
  | 'no_candidates';

export interface MostRelevantRoundResult {
  round: RoundLike | null;
  roundId: number | null;
  reason: MostRelevantRoundReason;
  orderedRoundIds: number[];
}

export function isRoundCompleted(status: RoundRealTimeStatus | undefined): boolean {
  if (!status) return false;
  if (status.all_scored === true) return true;
  if (status.status === 'COMPLETE') return true;
  return status.total_games > 0 && status.scored_games >= status.total_games;
}

function getEarliestStartTime(roundSquads: SquadLike[]): Date {
  const parsed = roundSquads
    .map((squad) => parseNaiveDateTimeToDate(squad.start_datetime ?? null))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());
  return parsed[0] ?? new Date(0);
}

function rankRoundsByActivity(
  rounds: RoundLike[] | null | undefined,
  allSquads: SquadLike[] | null | undefined,
  roundStatusData: RoundStatusMap,
  now: Date
): RankedRound[] {
  if (!Array.isArray(rounds) || !Array.isArray(allSquads) || allSquads.length === 0) {
    return [];
  }

  const ranked = rounds
    .map((round): RankedRound | null => {
      const squadsForRound = allSquads.filter((squad) => squad.round_id === round.id);
      if (squadsForRound.length === 0) return null;

      const earliestStartTime = getEarliestStartTime(squadsForRound);
      const status = roundStatusData?.[round.id];
      const completed = isRoundCompleted(status);

      return {
        round,
        earliestStartTime,
        isCompleted: completed,
        isInProgress: !completed && earliestStartTime.getTime() <= now.getTime(),
        isUpcoming: !completed && earliestStartTime.getTime() > now.getTime(),
      };
    })
    .filter((item): item is RankedRound => Boolean(item));

  ranked.sort((a, b) => a.earliestStartTime.getTime() - b.earliestStartTime.getTime());
  return ranked;
}

/**
 * Resolve the round a workspace surface (Squads / Game Scoring / Lanes) should default to.
 *
 * Priority:
 * 1. Earliest uncompleted round (ranked by earliest squad start time). This is the round a
 *    director most likely still needs to work on, so it takes precedence over anything else.
 *    The `reason` is refined to `in_progress` (already started) or `upcoming` (not yet started)
 *    purely for observability — it does not change which round is chosen.
 * 2. If every candidate round is complete, fall back to the earliest round overall.
 * 3. If there are no candidate rounds (no squads), there is nothing to select.
 */
export function getMostRelevantRound(params: {
  rounds: RoundLike[] | null | undefined;
  allSquads: SquadLike[] | null | undefined;
  roundStatusData: RoundStatusMap;
  now?: Date;
}): MostRelevantRoundResult {
  const now = params.now ?? new Date();
  const ranked = rankRoundsByActivity(params.rounds, params.allSquads, params.roundStatusData, now);
  const orderedRoundIds = ranked.map((entry) => entry.round.id);

  if (ranked.length === 0) {
    return {
      round: null,
      roundId: null,
      reason: 'no_candidates',
      orderedRoundIds,
    };
  }

  const earliestIncomplete = ranked.find((entry) => !entry.isCompleted);
  if (earliestIncomplete) {
    return {
      round: earliestIncomplete.round,
      roundId: earliestIncomplete.round.id,
      reason: earliestIncomplete.isInProgress ? 'in_progress' : 'upcoming',
      orderedRoundIds,
    };
  }

  return {
    round: ranked[0].round,
    roundId: ranked[0].round.id,
    reason: 'all_completed_fallback',
    orderedRoundIds,
  };
}

export function isRoundIdValid(roundId: number | null, rounds: RoundLike[] | null | undefined): boolean {
  if (roundId == null || !Array.isArray(rounds)) return false;
  return rounds.some((round) => round.id === roundId);
}
