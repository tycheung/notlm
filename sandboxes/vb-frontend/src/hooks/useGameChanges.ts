import { useState, useMemo, useCallback } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { GamesAPI } from '../api/games';
import { SquadRead } from '../types/squad';
import { GameRead, GameUpdate } from '../types/game';
import { useTemporaryGames, TemporaryGameMetadata } from './useTemporaryGames';

/**
 * Deduplicate squad vs round fetches. Prefer `id` when present; else composite key
 * (aligned with useMatchPlayGameGrid.gameRowKey).
 */
export function gameRowKeyForMerge(g: GameRead | Record<string, unknown>): string {
  const id = Number((g as GameRead).id ?? 0);
  if (id) return `id:${id}`;
  const r = g as Record<string, unknown>;
  const sid = Number(r.match_series_id ?? r.matchSeriesId ?? 0);
  const idx = Number(r.match_game_index ?? r.matchGameIndex ?? 0);
  const team = Number(r.team_id ?? 0);
  const ep = Number(r.event_participant_id ?? 0);
  const tg = Boolean(r.is_team_game);
  return `s:${sid}:i:${idx}:t:${team}:e:${ep}:tg:${tg}`;
}

function mergeSquadAndRoundGames(
  fromSquads: GameRead[],
  fromRound: GameRead[] | undefined
): GameRead[] {
  if (!fromRound || fromRound.length === 0) {
    return fromSquads;
  }
  if (fromSquads.length === 0) {
    return fromRound;
  }
  const map = new Map<string, GameRead>();
  for (const g of fromSquads) {
    map.set(gameRowKeyForMerge(g), g);
  }
  for (const g of fromRound) {
    const k = gameRowKeyForMerge(g);
    if (!map.has(k)) {
      map.set(k, g);
    }
  }
  return Array.from(map.values());
}

interface PendingGameChanges {
  [gameId: number]: GameUpdate;
}

interface UseGameChangesProps {
  squads: SquadRead[];
  /** When set, fetches all games for this round (includes match-play with squad_id null). Merged with squad fetches. */
  roundId?: number | null;
  /**
   * Baker / team score sheets only need team aggregate shells. Skips per-squad
   * pagination and filters the round fetch — avoids loading tens of thousands of
   * member / match-series shells.
   */
  teamGamesOnly?: boolean;
}

/** Team aggregate rows reuse the first member's event_participant_id; member rows are is_team_game false */
function isMemberGameRow(game: GameRead): boolean {
  return game.is_team_game !== true;
}

interface UseGameChangesReturn {
  pendingGameChanges: PendingGameChanges;
  squadGames: GameRead[];
  loadingGames: boolean;
  handleGameScoreChange: (gameId: number, field: keyof GameUpdate, value: any) => void;
  handleTemporaryGameScoreChange: (metadata: TemporaryGameMetadata, field: keyof GameUpdate, value: any) => string;
  getPendingGameValue: (gameId: number | string, field: keyof GameUpdate) => any;
  hasGamePendingChanges: (gameId: number | string) => boolean;
  hasAnyGamePendingChanges: () => boolean;
  clearGameChanges: () => void;
  getParticipantGames: (participantId: number, squadParticipantId?: number) => GameRead[];
  getGameIdForParticipantAndGameNumber: (participantId: number, gameNumber: number, squadParticipantId?: number) => number | null;
  getTeamGames: (teamId: number, gameNumber?: number) => GameRead[];
  getTeamGameIdForTeamAndGameNumber: (teamId: number, gameNumber: number) => number | null;
  temporaryGames: ReturnType<typeof useTemporaryGames>;
}

export const useGameChanges = ({
  squads,
  roundId,
  teamGamesOnly = false,
}: UseGameChangesProps): UseGameChangesReturn => {
  const [pendingGameChanges, setPendingGameChanges] = useState<PendingGameChanges>({});
  const temporaryGames = useTemporaryGames();

  const useRoundTeamGamesOnly =
    teamGamesOnly && roundId != null && roundId > 0;

  // Fetch games for squads using useQueries (skipped when round team-only fetch is enough)
  const squadGamesResults = useQueries({
    queries: squads.map(squad => ({
      queryKey: ['squadGames', squad.id],
      queryFn: () => GamesAPI.getAllGamesBySquad(squad.id),
      enabled: !!squad.id && !useRoundTeamGamesOnly,
    })),
  });

  const { data: roundGamesData, isLoading: isRoundGamesLoading } = useQuery({
    queryKey: ['roundGames', roundId, useRoundTeamGamesOnly ? 'team' : 'all'],
    queryFn: () =>
      GamesAPI.getGamesByRound(roundId as number, {
        ...(useRoundTeamGamesOnly ? { is_team_game: true } : {}),
      }),
    enabled: roundId != null && roundId > 0,
  });

  const fromSquadsOnly = useMemo(
    () =>
      useRoundTeamGamesOnly
        ? []
        : squadGamesResults.flatMap((result) => result.data || []),
    [squadGamesResults, useRoundTeamGamesOnly]
  );

  const squadGames = useMemo(
    () => mergeSquadAndRoundGames(fromSquadsOnly, roundGamesData),
    [fromSquadsOnly, roundGamesData]
  );

  const loadingGames =
    (!useRoundTeamGamesOnly &&
      squadGamesResults.some((result) => result.isLoading)) ||
    (roundId != null && roundId > 0 && isRoundGamesLoading);

  // Index team shells for O(1) score-sheet lookups.
  // Prefer: squad-scoped > match-series; scored > blank; then lowest id.
  const teamGameIdByKey = useMemo(() => {
    const map = new Map<string, number>();
    const byId = new Map<number, GameRead>();
    for (const g of squadGames || []) {
      if (g.id != null) byId.set(g.id, g);
    }
    const rank = (g: GameRead): [number, number, number] => [
      g.squad_id != null ? 0 : 1,
      g.score !== null && g.score !== undefined ? 0 : 1,
      Number(g.id) || Number.MAX_SAFE_INTEGER,
    ];
    const better = (a: GameRead, b: GameRead): boolean => {
      const ra = rank(a);
      const rb = rank(b);
      for (let i = 0; i < 3; i++) {
        if (ra[i] !== rb[i]) return ra[i] < rb[i];
      }
      return false;
    };
    for (const g of squadGames || []) {
      if (g.is_team_game !== true || g.team_id == null || g.id == null) continue;
      const key = `${g.team_id}:${g.game_number}`;
      const existingId = map.get(key);
      if (existingId == null) {
        map.set(key, g.id);
        continue;
      }
      const existing = byId.get(existingId);
      if (!existing || better(g, existing)) map.set(key, g.id);
    }
    return map;
  }, [squadGames]);

  const getParticipantGames = useCallback((participantId: number, squadParticipantId?: number) => {
    if (squadParticipantId) {
      return (squadGames || []).filter(
        game => game.squad_participant_id === squadParticipantId && isMemberGameRow(game)
      );
    }
    return (squadGames || []).filter(
      game => game.event_participant_id === participantId && isMemberGameRow(game)
    );
  }, [squadGames]);

  // Get game ID for a specific participant and game number
  // For re-entries, we need to filter by squad_participant_id to get the correct game shells
  const getGameIdForParticipantAndGameNumber = useCallback((participantId: number, gameNumber: number, squadParticipantId?: number) => {
    let game;
    if (squadParticipantId) {
      game = (squadGames || []).find(g =>
        g.squad_participant_id === squadParticipantId &&
        g.game_number === gameNumber &&
        isMemberGameRow(g)
      );
    } else {
      game = (squadGames || []).find(g =>
        g.event_participant_id === participantId &&
        g.game_number === gameNumber &&
        isMemberGameRow(g)
      );
    }
    return game ? game.id : null;
  }, [squadGames]);

  // Get all games for a team (team games only)
  const getTeamGames = useCallback((teamId: number, gameNumber?: number) => {
    let games = (squadGames || []).filter(g => 
      g.team_id === teamId && g.is_team_game === true
    );
    if (gameNumber !== undefined) {
      games = games.filter(g => g.game_number === gameNumber);
    }
    return games;
  }, [squadGames]);

  // Get team game ID for a specific team and game number
  const getTeamGameIdForTeamAndGameNumber = useCallback((teamId: number, gameNumber: number) => {
    return teamGameIdByKey.get(`${teamId}:${gameNumber}`) ?? null;
  }, [teamGameIdByKey]);

  // Handle game score changes for existing games
  const handleGameScoreChange = useCallback((gameId: number, field: keyof GameUpdate, value: any) => {
    setPendingGameChanges(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        [field]: value
      }
    }));
  }, []);

  // Handle game score changes for temporary games (creates shell if needed)
  const handleTemporaryGameScoreChange = useCallback((metadata: TemporaryGameMetadata, field: keyof GameUpdate, value: any): string => {
    // Single state update avoids staging before the shell exists (React batching edge cases)
    return temporaryGames.createTemporaryGameShellWithPending(metadata, field, value);
  }, [temporaryGames]);

  // Get pending game value (supports both real and temporary IDs)
  const getPendingGameValue = useCallback((gameId: number | string, field: keyof GameUpdate) => {
    if (typeof gameId === 'string' && gameId.startsWith('temp-')) {
      return temporaryGames.getTemporaryGameValue(gameId, field);
    }
    const pendingChange = pendingGameChanges[gameId as number];
    return pendingChange ? pendingChange[field] : undefined;
  }, [pendingGameChanges, temporaryGames]);

  // Check if a specific game has pending changes (supports both real and temporary IDs)
  const hasGamePendingChanges = useCallback((gameId: number | string) => {
    if (typeof gameId === 'string' && gameId.startsWith('temp-')) {
      return temporaryGames.hasTemporaryGame(gameId);
    }
    return !!pendingGameChanges[gameId as number];
  }, [pendingGameChanges, temporaryGames]);

  // Check if any game has pending changes
  const hasAnyGamePendingChanges = useCallback(() => {
    return Object.keys(pendingGameChanges).length > 0 || temporaryGames.hasAnyTemporaryGames();
  }, [pendingGameChanges, temporaryGames]);

  // Clear all game changes
  const clearGameChanges = useCallback(() => {
    setPendingGameChanges({});
    temporaryGames.clearTemporaryGames();
  }, [temporaryGames]);

  return {
    pendingGameChanges,
    squadGames,
    loadingGames,
    handleGameScoreChange,
    handleTemporaryGameScoreChange,
    getPendingGameValue,
    hasGamePendingChanges,
    hasAnyGamePendingChanges,
    clearGameChanges,
    getParticipantGames,
    getGameIdForParticipantAndGameNumber,
    getTeamGames,
    getTeamGameIdForTeamAndGameNumber,
    temporaryGames
  };
};
