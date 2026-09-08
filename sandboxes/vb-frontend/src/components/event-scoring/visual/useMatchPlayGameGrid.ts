import { useMutation, type QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useCallback, useEffect, useRef } from 'react';
import { getErrorMessage } from '../../../api/apiErrors';
import { GamesAPI } from '../../../api/games';
import type { GameRead } from '../../../types/game';
import type { VisualMatchDraft } from './types';

const SHELL_MISSING_MESSAGE =
  'No game shell exists for this score yet. Sync match structure or wait for shells to be created.';

/** Coalesce rapid commits (e.g. blur then parent re-fire) for the same cell. */
const PERSIST_DEBOUNCE_MS = 150;

function gameRowKey(g: any): string {
  const id = Number(g?.id ?? 0);
  if (id) return `id:${id}`;
  const sid = Number(g?.match_series_id ?? g?.matchSeriesId ?? 0);
  const idx = Number(g?.match_game_index ?? g?.matchGameIndex ?? 0);
  const team = Number(g?.team_id ?? 0);
  const ep = Number(g?.event_participant_id ?? 0);
  const tg = Boolean(g?.is_team_game);
  return `s:${sid}:i:${idx}:t:${team}:e:${ep}:tg:${tg}`;
}

/** Merge prop `allGames` with latest `squadGames` + `roundGames` query cache so optimistic patches are visible. */
function mergedGamesList(
  allGames: any[],
  queryClient: QueryClient,
  roundId: number | null
): any[] {
  const map = new Map<string, any>();
  for (const g of allGames || []) {
    map.set(gameRowKey(g), g);
  }
  const cached = queryClient.getQueriesData<any[]>({ queryKey: ['squadGames'] });
  for (const [, rows] of cached) {
    if (!Array.isArray(rows)) continue;
    for (const g of rows) {
      map.set(gameRowKey(g), g);
    }
  }
  if (roundId != null && roundId > 0) {
    const roundRows = queryClient.getQueryData<any[]>(['roundGames', roundId]);
    if (Array.isArray(roundRows)) {
      for (const g of roundRows) {
        map.set(gameRowKey(g), g);
      }
    }
  }
  return Array.from(map.values());
}

function patchSquadGamesCache(
  queryClient: QueryClient,
  updater: (games: GameRead[]) => GameRead[]
) {
  queryClient.setQueriesData<GameRead[]>({ queryKey: ['squadGames'] }, (current) => {
    if (!Array.isArray(current)) return current;
    return updater(current);
  });
}

function patchRoundGamesCache(
  queryClient: QueryClient,
  roundId: number,
  updater: (games: GameRead[]) => GameRead[]
) {
  queryClient.setQueryData<GameRead[]>(['roundGames', roundId], (current) => {
    if (!Array.isArray(current)) return current;
    return updater(current);
  });
}

export function useMatchPlayGameGrid({
  queryClient,
  selectedRoundId,
  allGames,
  isTeamEvent,
  matches,
  onPersistError,
  eventId,
}: {
  queryClient: QueryClient;
  selectedRoundId: number | null;
  eventId?: number | null;
  allGames: any[];
  isTeamEvent: boolean;
  matches: VisualMatchDraft[];
  onPersistError?: (message: string) => void;
}) {
  const findGame = useCallback(
    (seriesId: number, sideId: number | null | undefined, gameIndex: number) => {
      if (!sideId) return null;
      const gamesForLookup = mergedGamesList(allGames, queryClient, selectedRoundId);
      return gamesForLookup.find((g: any) => {
        const sid = Number(g.match_series_id ?? g.matchSeriesId ?? 0);
        const idx = Number(g.match_game_index ?? g.matchGameIndex ?? 0);
        if (sid !== Number(seriesId) || idx !== Number(gameIndex)) return false;
        if (isTeamEvent) return Number(g.team_id) === Number(sideId) && Boolean(g.is_team_game);
        return Number(g.event_participant_id) === Number(sideId) && !Boolean(g.is_team_game);
      });
    },
    [allGames, isTeamEvent, queryClient, selectedRoundId]
  );

  const getGameScore = useCallback(
    (matchId: string, side: 0 | 1, gameIndex: number): number | null => {
      const match = matches.find((m) => m.id === matchId);
      if (!match?.seriesId) return null;
      const sideId = side === 0 ? match.sideAId : match.sideBId;
      if (!sideId) return null;
      const g = findGame(Number(match.seriesId), sideId, gameIndex);
      return typeof g?.score === 'number' ? g.score : null;
    },
    [findGame, matches]
  );

  const mutation = useMutation({
    mutationFn: async (args: {
      matchId: string;
      side: 0 | 1;
      gameIndex: number;
      value: number | null;
    }) => {
      const { matchId, side, gameIndex, value } = args;
      if (!selectedRoundId) throw new Error('round');
      const match = matches.find((m) => m.id === matchId);
      if (!match?.seriesId) throw new Error('series');
      const sideId = side === 0 ? match.sideAId : match.sideBId;
      if (!sideId) throw new Error('side');

      const existingGame = findGame(Number(match.seriesId), sideId, gameIndex);
      if (!existingGame?.id) {
        const shellMissing = Object.assign(new Error(SHELL_MISSING_MESSAGE), {
          shellMissing: true,
        });
        throw shellMissing;
      }
      await GamesAPI.unifiedBatchGameOperation({
        temporary_shells: [],
        game_updates: [
          {
            game_id: Number(existingGame.id),
            score: value,
            match_series_id: Number(match.seriesId),
            match_game_index: gameIndex,
          },
        ],
      });
      return { gameId: Number(existingGame.id), value };
    },
    onMutate: async (args) => {
      const { matchId, side, gameIndex, value } = args;
      const match = matches.find((m) => m.id === matchId);
      if (!match?.seriesId) {
        return {
          previousSquad: null as [unknown, GameRead[]][] | null,
          previousRound: undefined as GameRead[] | undefined,
          selectedRoundId: null as number | null,
        };
      }
      const sideId = side === 0 ? match.sideAId : match.sideBId;
      if (!sideId) {
        return {
          previousSquad: null,
          previousRound: undefined,
          selectedRoundId: null,
        };
      }
      const existing = findGame(Number(match.seriesId), sideId, gameIndex);
      await queryClient.cancelQueries({ queryKey: ['squadGames'] });
      if (selectedRoundId) {
        await queryClient.cancelQueries({ queryKey: ['roundGames', selectedRoundId] });
      }
      const previousSquad = queryClient.getQueriesData<GameRead[]>({ queryKey: ['squadGames'] });
      const previousRound =
        selectedRoundId != null
          ? queryClient.getQueryData<GameRead[]>(['roundGames', selectedRoundId])
          : undefined;
      if (existing?.id) {
        patchSquadGamesCache(queryClient, (games) =>
          games.map((g) => (g.id === existing.id ? { ...g, score: value ?? undefined } : g))
        );
        if (selectedRoundId) {
          patchRoundGamesCache(queryClient, selectedRoundId, (games) =>
            games.map((g) => (g.id === existing.id ? { ...g, score: value ?? undefined } : g))
          );
        }
      }
      return { previousSquad, previousRound, selectedRoundId: selectedRoundId ?? null };
    },
    onError: (e, _a, ctx) => {
      ctx?.previousSquad?.forEach(([key, data]) => {
        queryClient.setQueryData(key as any, data);
      });
      if (ctx?.previousRound !== undefined && ctx.selectedRoundId) {
        queryClient.setQueryData(['roundGames', ctx.selectedRoundId], ctx.previousRound);
      }
      if (onPersistError) {
        const shellMissing =
          (e as { shellMissing?: boolean })?.shellMissing === true ||
          (axios.isAxiosError(e) && e.response?.status === 409);
        const detail = shellMissing
          ? SHELL_MISSING_MESSAGE
          : getErrorMessage(e, e instanceof Error ? e.message : 'unknown');
        onPersistError(`Unable to save score right now (${detail}).`);
      }
    },
    onSettled: () => {
      // Fire-and-forget invalidations so "Saving…" clears as soon as the HTTP
      // call finishes; do not await refetches that rebuild the ladder mid-entry.
      void queryClient.invalidateQueries({ queryKey: ['squadGames'] });
      if (selectedRoundId) {
        void queryClient.invalidateQueries({ queryKey: ['roundGames', selectedRoundId] });
        void queryClient.invalidateQueries({
          queryKey: ['roundMatchSeries', selectedRoundId],
        });
      }
      if (eventId) {
        void queryClient.invalidateQueries({ queryKey: ['roundRealTimeStatus', eventId] });
        void queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      }
    },
  });

  const pendingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = pendingTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const persistGameScore = useCallback(
    (matchId: string, side: 0 | 1, gameIndex: number, value: number | null) => {
      const key = `${matchId}:${side}:${gameIndex}`;
      const existing = pendingTimers.current.get(key);
      if (existing) clearTimeout(existing);
      pendingTimers.current.set(
        key,
        setTimeout(() => {
          pendingTimers.current.delete(key);
          mutation.mutate({ matchId, side, gameIndex, value });
        }, PERSIST_DEBOUNCE_MS)
      );
    },
    [mutation]
  );

  return { getGameScore, persistGameScore, isSavingGame: mutation.isPending };
}
