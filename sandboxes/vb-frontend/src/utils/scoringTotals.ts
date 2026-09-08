import type { GameRead } from '../types/game';

/** Mirrors backend calculate_total_score: score + (handicap or 0). */
export function calculateTotalScore(
  score: number | null | undefined,
  handicap: number | null | undefined
): number | null {
  if (score === null || score === undefined) return null;
  return score + (handicap ?? 0);
}

export interface HandicapEventSettings {
  baseScore: number;
  percentage: number;
}

export interface GameScoreMergeContext {
  gameId?: number | null;
  tempId?: string;
  getPendingGameValue?: (gameId: number | string, field?: 'score') => unknown;
}

export interface SeriesTotals {
  totalScratch: number;
  totalWithHandicap: number;
  handicapTotal: number;
  gamesScored: number;
}

export interface HandicapSeriesInput {
  qualifyingAverage?: number | null;
  /** Manual per-participant override; null/undefined → use qualifying-average formula. */
  participantHandicap?: number | null;
  handicapSettings: HandicapEventSettings | null;
}

export interface TeamMemberSeriesInput extends HandicapSeriesInput {
  games: Array<Pick<GameRead, 'game_number' | 'score' | 'id'>>;
  getMergeForGame: (
    game: TeamMemberSeriesInput['games'][0] | undefined,
    gameNumber: number
  ) => GameScoreMergeContext | undefined;
}

/** Coerce roster/API values (string | number) for arithmetic. */
export function normalizeAverage(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Build settings from event tab props; null when handicap is disabled for the event. */
export function buildHandicapEventSettings(
  baseScore: number,
  percentage: number,
  enabled = true
): HandicapEventSettings | null {
  if (!enabled || percentage <= 0) return null;
  return { baseScore, percentage };
}

/**
 * Per-game handicap pins from event qualifying average.
 * Formula only — prefer ``resolveParticipantHandicapPins`` at call sites.
 */
export function calculateHandicapPinsPerGame(
  qualifyingAverage: number | null | undefined,
  settings: HandicapEventSettings
): number {
  const avg = normalizeAverage(qualifyingAverage);
  if (avg === null) return 0;
  if (avg >= settings.baseScore) return 0;
  return Math.floor(((settings.baseScore - avg) * settings.percentage) / 100);
}

/**
 * Resolve per-game handicap pins (mirrors backend resolve_participant_handicap_pins).
 * Manual participant override (including 0) wins over the event formula.
 */
export function resolveParticipantHandicapPins(
  participantHandicap: number | null | undefined,
  qualifyingAverage: number | null | undefined,
  settings: HandicapEventSettings | null | undefined
): number {
  if (participantHandicap !== null && participantHandicap !== undefined) {
    return participantHandicap;
  }
  if (!settings) return 0;
  return calculateHandicapPinsPerGame(qualifyingAverage, settings);
}

function resolvePendingScratch(
  gameId: number | null | undefined,
  tempId: string | undefined,
  getPendingGameValue?: GameScoreMergeContext['getPendingGameValue']
): number | null | undefined {
  if (!getPendingGameValue) return undefined;
  if (gameId != null) {
    const v = getPendingGameValue(gameId, 'score');
    if (v !== undefined) return v as number | null;
  }
  if (tempId) {
    const v = getPendingGameValue(tempId, 'score');
    if (v !== undefined) return v as number | null;
  }
  return undefined;
}

/**
 * Per-game scratch + handicap for scoring tables.
 * Uses participant manual handicap when set; otherwise event qual-avg formula.
 * Does not use legacy games.handicap on the game record for display.
 */
export function computeGameHandicapValues(
  game: Pick<GameRead, 'score'> | null | undefined,
  merge?: GameScoreMergeContext,
  handicapInput?: HandicapSeriesInput | null
): { scratch: number | null; handicapPins: number; totalWithHandicap: number | null } {
  const pendingScratch = resolvePendingScratch(merge?.gameId, merge?.tempId, merge?.getPendingGameValue);

  const scratch =
    pendingScratch !== undefined
      ? pendingScratch
      : game?.score !== null && game?.score !== undefined
        ? game.score
        : null;

  if (scratch === null || scratch === undefined) {
    return { scratch: null, handicapPins: 0, totalWithHandicap: null };
  }

  const handicapPins =
    handicapInput != null
      ? resolveParticipantHandicapPins(
          handicapInput.participantHandicap,
          handicapInput.qualifyingAverage,
          handicapInput.handicapSettings
        )
      : 0;

  return { scratch, handicapPins, totalWithHandicap: scratch + handicapPins };
}

export function computeSeriesTotals(
  games: Array<Pick<GameRead, 'game_number' | 'score' | 'id'>>,
  options: {
    gameNumbers?: number[];
    getMergeForGame?: (game: (typeof games)[0], gameNumber: number) => GameScoreMergeContext | undefined;
    qualifyingAverage?: number | null;
    participantHandicap?: number | null;
    handicapSettings?: HandicapEventSettings | null;
  }
): SeriesTotals {
  const handicapInput: HandicapSeriesInput | null =
    options.handicapSettings != null
      ? {
          qualifyingAverage: options.qualifyingAverage,
          participantHandicap: options.participantHandicap,
          handicapSettings: options.handicapSettings,
        }
      : null;

  const gameNumbers =
    options.gameNumbers ??
    [...new Set(games.map((g) => g.game_number).filter((n) => n > 0))].sort((a, b) => a - b);

  let totalScratch = 0;
  let totalWithHandicap = 0;
  let handicapTotal = 0;
  let gamesScored = 0;

  for (const gameNum of gameNumbers) {
    const game = games.find((g) => g.game_number === gameNum);
    const merge = options.getMergeForGame?.(game as (typeof games)[0], gameNum);
    const { scratch, handicapPins, totalWithHandicap: hc } = computeGameHandicapValues(
      game,
      merge,
      handicapInput
    );
    if (scratch === null) continue;
    gamesScored += 1;
    totalScratch += scratch;
    handicapTotal += handicapPins;
    totalWithHandicap += hc ?? scratch + handicapPins;
  }

  return { totalScratch, totalWithHandicap, handicapTotal, gamesScored };
}

export function formatSeriesTotal(value: number, gamesScored: number): string {
  if (gamesScored === 0) return '—';
  return String(value);
}

function memberHandicapInput(member: TeamMemberSeriesInput): HandicapSeriesInput {
  return {
    qualifyingAverage: member.qualifyingAverage,
    participantHandicap: member.participantHandicap,
    handicapSettings: member.handicapSettings,
  };
}

/** Team series: per game, sum member scratch/handicap pins, then sum across games. */
export function computeTeamSeriesTotalsFromMembers(
  members: TeamMemberSeriesInput[],
  gameNumbers: number[]
): SeriesTotals {
  let totalScratch = 0;
  let totalWithHandicap = 0;
  let handicapTotal = 0;
  let gamesScored = 0;

  for (const gameNum of gameNumbers) {
    let gameScratch = 0;
    let gameHandicap = 0;
    let gameTotal = 0;
    let anyScored = false;

    for (const member of members) {
      const game = member.games.find((g) => g.game_number === gameNum);
      const merge = member.getMergeForGame(game, gameNum);
      const { scratch, handicapPins, totalWithHandicap: hc } = computeGameHandicapValues(
        game,
        merge,
        memberHandicapInput(member)
      );
      if (scratch === null) continue;
      anyScored = true;
      gameScratch += scratch;
      gameHandicap += handicapPins;
      gameTotal += hc ?? scratch + handicapPins;
    }

    if (!anyScored) continue;
    gamesScored += 1;
    totalScratch += gameScratch;
    handicapTotal += gameHandicap;
    totalWithHandicap += gameTotal;
  }

  return { totalScratch, totalWithHandicap, handicapTotal, gamesScored };
}

export function sumMemberScratchForTeamGame(
  members: TeamMemberSeriesInput[],
  gameNum: number
): number {
  let sum = 0;
  for (const member of members) {
    const game = member.games.find((g) => g.game_number === gameNum);
    const merge = member.getMergeForGame(game, gameNum);
    const { scratch } = computeGameHandicapValues(game, merge);
    if (scratch !== null) sum += scratch;
  }
  return sum;
}
