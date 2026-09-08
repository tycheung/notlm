import { GamesAPI } from '../api/games';
import type { TemporaryGameMetadata } from '../hooks/useTemporaryGames';
import type {
  BulkScoreUpdate,
  GameRead,
  GameUpdate,
  TeamMemberScoreUpdate,
  TemporaryGameShellData,
  UnifiedBatchGameRequest,
  UnifiedBatchGameResponse,
} from '../types/game';

export const TEAM_MEMBER_SCORE_CHUNK_SIZE = 200;
export const GAME_SHELL_CHUNK_SIZE = 200;
export const GAME_UPDATE_CHUNK_SIZE = 400;

export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export function mergeBatchResponses(
  responses: UnifiedBatchGameResponse[]
): UnifiedBatchGameResponse {
  return responses.reduce<UnifiedBatchGameResponse>(
    (acc, response) => ({
      success: acc.success && (response.success ?? true),
      message: `${acc.message} ${response.message || ''}`.trim(),
      created_games: [...(acc.created_games || []), ...(response.created_games || [])],
      updated_games: [...(acc.updated_games || []), ...(response.updated_games || [])],
      temp_id_mapping: {
        ...(acc.temp_id_mapping || {}),
        ...(response.temp_id_mapping || {}),
      },
      errors: [...(acc.errors || []), ...(response.errors || [])],
    }),
    {
      success: true,
      message: '',
      created_games: [],
      updated_games: [],
      temp_id_mapping: {},
      errors: [],
    }
  );
}

export type TemporaryGameShellEntry = {
  metadata: TemporaryGameMetadata;
  pendingChanges: Partial<GameUpdate>;
};

export type PendingGameChangesMap = Record<number, GameUpdate>;

export type BuildPendingGameScorePayloadsInput = {
  squadGames: GameRead[];
  pendingGameChanges: PendingGameChangesMap;
  temporaryShells: Record<string, TemporaryGameShellEntry>;
  isTeamEvent?: boolean;
  teamScoringMode?: 'individual' | 'mixed' | 'team';
};

export type PendingGameScorePayloads = {
  teamMemberScores: TeamMemberScoreUpdate[];
  temporaryShellsData: TemporaryGameShellData[];
  gameUpdates: BulkScoreUpdate[];
};

function teamTempId(teamId: number, gameNumber: number): string {
  return `temp-team-${teamId}-${gameNumber}`;
}

function shellToTemporaryGameShellData(
  tempId: string,
  metadata: TemporaryGameMetadata,
  pendingChanges: Partial<GameUpdate>
): TemporaryGameShellData {
  return {
    temp_id: tempId,
    event_participant_id: metadata.event_participant_id,
    squad_participant_id: metadata.squad_participant_id,
    team_id: metadata.team_id,
    user_id: metadata.user_id,
    game_number: metadata.game_number,
    round_id: metadata.round_id,
    squad_id: metadata.squad_id,
    team_game_id: metadata.team_game_id,
    is_team_game: metadata.is_team_game,
    score: pendingChanges.score !== undefined ? pendingChanges.score : null,
  };
}

/** Mixed mode: team aggregate pending for team+game blocks member saves for that slot. */
function buildMixedModeBlockedMemberKeys(
  squadGames: GameRead[],
  pendingGameChanges: PendingGameChangesMap,
  temporaryShells: Record<string, TemporaryGameShellEntry>
): Set<string> {
  const teamScoreKeys = new Set<string>();

  for (const [gameId, changes] of Object.entries(pendingGameChanges)) {
    if (changes.score === undefined) continue;
    const game = squadGames.find((g) => g.id === parseInt(gameId, 10));
    if (game?.is_team_game && game.team_id != null && game.game_number != null) {
      teamScoreKeys.add(`${game.team_id}:${game.game_number}`);
    }
  }

  for (const [, shell] of Object.entries(temporaryShells)) {
    const { metadata, pendingChanges } = shell;
    if (
      metadata.is_team_game &&
      metadata.team_id != null &&
      pendingChanges.score !== undefined &&
      pendingChanges.score !== null
    ) {
      teamScoreKeys.add(`${metadata.team_id}:${metadata.game_number}`);
    }
  }

  return teamScoreKeys;
}

/** Mixed mode: member pending for team+game blocks team aggregate update for that slot. */
function buildMixedModeBlockedTeamKeys(
  squadGames: GameRead[],
  pendingGameChanges: PendingGameChangesMap,
  temporaryShells: Record<string, TemporaryGameShellEntry>
): Set<string> {
  const memberScoreKeys = new Set<string>();

  for (const [gameId, changes] of Object.entries(pendingGameChanges)) {
    if (changes.score === undefined) continue;
    const game = squadGames.find((g) => g.id === parseInt(gameId, 10));
    if (game?.parent_game_id && !game.is_team_game && game.team_id != null && game.game_number != null) {
      memberScoreKeys.add(`${game.team_id}:${game.game_number}`);
    }
  }

  for (const [, shell] of Object.entries(temporaryShells)) {
    const { metadata, pendingChanges } = shell;
    if (
      !metadata.is_team_game &&
      metadata.team_id != null &&
      typeof pendingChanges.score === 'number' &&
      !Number.isNaN(pendingChanges.score) &&
      (Boolean(metadata.team_game_id) || metadata.team_id != null)
    ) {
      memberScoreKeys.add(`${metadata.team_id}:${metadata.game_number}`);
    }
  }

  return memberScoreKeys;
}

function memberKey(teamId: number | null | undefined, gameNumber: number): string | null {
  if (teamId == null) return null;
  return `${teamId}:${gameNumber}`;
}

export function buildPendingGameScorePayloads(
  input: BuildPendingGameScorePayloadsInput
): PendingGameScorePayloads {
  const {
    squadGames,
    pendingGameChanges,
    temporaryShells,
    isTeamEvent = false,
    teamScoringMode = 'individual',
  } = input;

  const teamMemberScores: TeamMemberScoreUpdate[] = [];
  const temporaryShellsData: TemporaryGameShellData[] = [];
  const gameUpdates: BulkScoreUpdate[] = [];

  const mixedModeMemberBlocks =
    isTeamEvent && teamScoringMode === 'mixed'
      ? buildMixedModeBlockedMemberKeys(squadGames, pendingGameChanges, temporaryShells)
      : new Set<string>();
  const mixedModeTeamBlocks =
    isTeamEvent && teamScoringMode === 'mixed'
      ? buildMixedModeBlockedTeamKeys(squadGames, pendingGameChanges, temporaryShells)
      : new Set<string>();

  for (const [tempId, shell] of Object.entries(temporaryShells)) {
    const { metadata, pendingChanges } = shell;
    const memberScore = pendingChanges.score;

    const isTeamMemberShell =
      !metadata.is_team_game &&
      typeof memberScore === 'number' &&
      !Number.isNaN(memberScore) &&
      (Boolean(metadata.team_game_id) || metadata.team_id != null);

    if (isTeamMemberShell) {
      const key = memberKey(metadata.team_id, metadata.game_number);
      if (key && mixedModeMemberBlocks.has(key)) {
        continue;
      }
      teamMemberScores.push({
        team_game_id: metadata.team_game_id ?? 0,
        event_participant_id: metadata.event_participant_id,
        score: memberScore,
        temp_id: tempId,
        round_id: metadata.round_id ?? undefined,
        squad_id: metadata.squad_id ?? undefined,
        team_id: metadata.team_id ?? undefined,
        game_number: metadata.game_number,
      });
    } else {
      temporaryShellsData.push(shellToTemporaryGameShellData(tempId, metadata, pendingChanges));
    }
  }

  for (const [gameId, changes] of Object.entries(pendingGameChanges)) {
    if (changes.score === undefined) {
      continue;
    }

    const game = squadGames.find((g) => g.id === parseInt(gameId, 10));

    if (game && game.parent_game_id && !game.is_team_game && changes.score !== undefined) {
      const key = memberKey(game.team_id, game.game_number);
      if (key && mixedModeMemberBlocks.has(key)) {
        continue;
      }
      teamMemberScores.push({
        team_game_id: game.parent_game_id,
        event_participant_id: game.event_participant_id,
        score: changes.score,
      });
    } else {
      if (game?.is_team_game && game.team_id != null && game.game_number != null) {
        const key = memberKey(game.team_id, game.game_number);
        if (key && mixedModeTeamBlocks.has(key)) {
          continue;
        }
      }
      gameUpdates.push({
        game_id: parseInt(gameId, 10),
        score: changes.score ?? null,
        ...(changes.handicap !== undefined ? { handicap: changes.handicap ?? null } : {}),
      });
    }
  }

  return { teamMemberScores, temporaryShellsData, gameUpdates };
}

/** Attach team_id/game_number so unified batch can resolve parent team_game_id from temp shells. */
export function prepareTeamMemberScoresForUnifiedBatch(
  teamMemberScores: TeamMemberScoreUpdate[],
  temporaryShells: Record<string, TemporaryGameShellEntry>
): TeamMemberScoreUpdate[] {
  return teamMemberScores.map((entry) => {
    const shell = entry.temp_id ? temporaryShells[entry.temp_id] : undefined;
    if (!shell) {
      return entry;
    }
    return {
      ...entry,
      team_id: shell.metadata.team_id ?? entry.team_id,
      game_number: shell.metadata.game_number ?? entry.game_number,
    };
  });
}

export function buildCombinedUnifiedRequests(
  temporaryShellsData: TemporaryGameShellData[],
  gameUpdates: BulkScoreUpdate[],
  teamMemberScores: TeamMemberScoreUpdate[] = []
): UnifiedBatchGameRequest[] {
  if (
    temporaryShellsData.length === 0 &&
    gameUpdates.length === 0 &&
    teamMemberScores.length === 0
  ) {
    return [];
  }

  const shellChunks = chunkArray(temporaryShellsData, GAME_SHELL_CHUNK_SIZE);
  const updateChunks = chunkArray(gameUpdates, GAME_UPDATE_CHUNK_SIZE);
  const chunkCount = Math.max(shellChunks.length, updateChunks.length, 1);

  const requests: UnifiedBatchGameRequest[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const shells = shellChunks[i] ?? [];
    const updates = updateChunks[i] ?? [];
    if (shells.length === 0 && updates.length === 0) {
      continue;
    }
    requests.push({
      temporary_shells: shells,
      game_updates: updates,
      team_member_scores: [],
    });
  }

  if (requests.length === 0) {
    requests.push({
      temporary_shells: [],
      game_updates: [],
      team_member_scores: teamMemberScores,
    });
  } else {
    requests[requests.length - 1].team_member_scores = teamMemberScores;
  }

  return requests;
}

export function resolveTeamGameIdForMember(
  metadata: TemporaryGameMetadata,
  tempIdMapping: Record<string, number>
): number | null {
  if (metadata.team_game_id != null && metadata.team_game_id > 0) {
    return metadata.team_game_id;
  }
  if (metadata.team_id != null) {
    const mapped = tempIdMapping[teamTempId(metadata.team_id, metadata.game_number)];
    if (mapped != null && mapped > 0) {
      return mapped;
    }
  }
  return null;
}

export function remapTeamMemberScoresAfterUnified(
  teamMemberScores: TeamMemberScoreUpdate[],
  temporaryShells: Record<string, TemporaryGameShellEntry>,
  tempIdMapping: Record<string, number>
): TeamMemberScoreUpdate[] {
  return teamMemberScores.map((entry) => {
    if (entry.team_game_id > 0) {
      return entry;
    }
    const shell = entry.temp_id ? temporaryShells[entry.temp_id] : undefined;
    if (!shell) {
      return entry;
    }
    const resolved = resolveTeamGameIdForMember(shell.metadata, tempIdMapping);
    if (resolved == null) {
      return entry;
    }
    return { ...entry, team_game_id: resolved };
  });
}

export function evaluateBatchSaveOutcome(
  response: UnifiedBatchGameResponse,
  hadPayload: boolean
): { saveSucceeded: boolean; hasResults: boolean } {
  const createdLen = response.created_games?.length ?? 0;
  const updatedLen = response.updated_games?.length ?? 0;
  const mappingLen =
    response.temp_id_mapping && typeof response.temp_id_mapping === 'object'
      ? Object.keys(response.temp_id_mapping).length
      : 0;
  const errorLen = response.errors?.length ?? 0;
  const hasExplicitSuccess = response.success === true;
  const hasResults = createdLen > 0 || updatedLen > 0 || mappingLen > 0;
  const saveSucceeded =
    hasExplicitSuccess || (hasResults && errorLen === 0) || (hadPayload && errorLen === 0);
  return { saveSucceeded, hasResults };
}

export async function persistPendingGameScores(
  payloads: PendingGameScorePayloads,
  temporaryShells: Record<string, TemporaryGameShellEntry>
): Promise<UnifiedBatchGameResponse> {
  const { teamMemberScores, temporaryShellsData, gameUpdates } = payloads;
  const allResponses: UnifiedBatchGameResponse[] = [];

  const preparedMemberScores = prepareTeamMemberScoresForUnifiedBatch(
    teamMemberScores,
    temporaryShells
  );

  const unifiedRequests = buildCombinedUnifiedRequests(
    temporaryShellsData,
    gameUpdates,
    preparedMemberScores
  );

  const useCoalescedMemberBatch = unifiedRequests.length <= 1;

  if (useCoalescedMemberBatch) {
    for (const request of unifiedRequests) {
      const response = await GamesAPI.unifiedBatchGameOperation(request);
      allResponses.push(response);
    }
    return mergeBatchResponses(allResponses);
  }

  let accumulatedMapping: Record<string, number> = {};
  for (const request of unifiedRequests) {
    const response = await GamesAPI.unifiedBatchGameOperation({
      ...request,
      team_member_scores: [],
    });
    allResponses.push(response);
    accumulatedMapping = {
      ...accumulatedMapping,
      ...(response.temp_id_mapping ?? {}),
    };
  }

  const remappedMemberScores = remapTeamMemberScoresAfterUnified(
    preparedMemberScores,
    temporaryShells,
    accumulatedMapping
  ).filter((entry) => entry.team_game_id > 0);

  if (remappedMemberScores.length > 0) {
    const memberChunks = chunkArray(remappedMemberScores, TEAM_MEMBER_SCORE_CHUNK_SIZE);
    for (const memberChunk of memberChunks) {
      const memberResponse = await GamesAPI.batchTeamMemberScores({
        team_member_scores: memberChunk,
      });
      allResponses.push(memberResponse);
    }
  }

  return mergeBatchResponses(allResponses);
}
