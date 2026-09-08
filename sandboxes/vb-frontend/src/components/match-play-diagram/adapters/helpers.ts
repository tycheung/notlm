import type { MatchSeriesParticipant, MatchSeriesRead } from '../../../api/round-match-series';
import type { DiagramParticipant, DiagramScoreCell } from './types';
import {
  buildParticipantOptions,
  findParticipantOptionBySideId,
  matchSideSlotId,
} from '../../event-scoring/visual/adapters/helpers';

export function roundHeader(roundIndex: number, totalRounds: number): string {
  if (totalRounds <= 0) return `Round ${roundIndex + 1}`;
  if (roundIndex >= totalRounds - 1) return 'Final';
  const remainingRounds = totalRounds - roundIndex;
  const field = 2 ** remainingRounds;
  if (field === 4) return 'Semifinals';
  if (field === 8) return 'Quarterfinals';
  if (field >= 16) return `Round of ${field}`;
  return `Round ${roundIndex + 1}`;
}

export function winsBadge(wins0: number, wins1: number, raceTo: number): string | null {
  if (wins0 <= 0 && wins1 <= 0) return null;
  if (raceTo <= 1) return null;
  return `${wins0}-${wins1}`;
}

export function findGameForSide(
  allGames: any[],
  seriesId: number,
  sideId: number,
  gameIndex: number,
  isTeamEvent: boolean
): any | null {
  return (
    allGames.find((g) => {
      const sid = Number(g.match_series_id ?? g.matchSeriesId ?? 0);
      const idx = Number(g.match_game_index ?? g.matchGameIndex ?? 0);
      if (sid !== seriesId || idx !== gameIndex) return false;
      if (isTeamEvent) return Number(g.team_id) === sideId && Boolean(g.is_team_game);
      return Number(g.event_participant_id) === sideId && !Boolean(g.is_team_game);
    }) ?? null
  );
}

export function buildScoreCells(
  allGames: any[],
  seriesId: number,
  sideId: number | null,
  maxGames: number,
  isTeamEvent: boolean
): DiagramScoreCell[] {
  if (!sideId) {
    return Array.from({ length: maxGames }, (_, i) => ({
      gameIndex: i + 1,
      score: null,
      gameId: null,
      disabled: true,
    }));
  }
  return Array.from({ length: maxGames }, (_, i) => {
    const gameIndex = i + 1;
    const game = findGameForSide(allGames, seriesId, sideId, gameIndex, isTeamEvent);
    return {
      gameIndex,
      score: typeof game?.score === 'number' ? game.score : null,
      gameId: game?.id ? Number(game.id) : null,
      disabled: !game?.id,
    };
  });
}

export function buildDiagramParticipant(
  side: MatchSeriesParticipant | undefined,
  sideNum: 0 | 1,
  options: ReturnType<typeof buildParticipantOptions>,
  allGames: any[],
  series: MatchSeriesRead,
  isTeamEvent: boolean,
  winnerSide: 0 | 1 | null
): DiagramParticipant {
  const sideId = matchSideSlotId(side);
  const option = sideId ? findParticipantOptionBySideId(options, sideId) : undefined;
  const name = option?.label ?? (sideId ? `Participant ${sideId}` : 'TBD');
  const maxGames = Math.max(1, Number(series.max_games || 1));

  return {
    side: sideNum,
    name,
    sideId,
    isWinner: winnerSide === sideNum,
    isTbd: !sideId,
    scores: buildScoreCells(allGames, series.id, sideId, maxGames, isTeamEvent),
    teamMembers: option?.teamMembers,
  };
}
