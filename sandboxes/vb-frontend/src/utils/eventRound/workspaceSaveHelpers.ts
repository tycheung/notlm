/**
 * Pure helpers for EventRoundWorkspace save / invalidation paths.
 * Keep orchestration UI thin; unit-test these contracts.
 */

export type BatchSaveErrorLike = {
  temp_id?: string | number;
  game_id?: string | number;
  team_game_id?: string | number;
  error?: string;
};

export function formatGameBatchErrors(
  errors: BatchSaveErrorLike[] | undefined | null,
  fallback = 'No games were created or updated'
): string {
  if (!errors || errors.length === 0) {
    return fallback;
  }
  return errors
    .map((e) => `${e.temp_id || e.game_id || e.team_game_id || 'Unknown'}: ${e.error}`)
    .join('; ');
}

export function workspacePostSaveQueryKeys(eventId: number, selectedRoundId: number | null) {
  return [
    ['squadParticipants'] as const,
    ['eventParticipants', eventId] as const,
    ['eventSquads', eventId] as const,
    ['eventComplete', eventId] as const,
    ['squadGames'] as const,
    ['allPoolParticipants', selectedRoundId] as const,
    ['roundRealTimeStatus', eventId] as const,
    ['eventChampionshipResults', eventId] as const,
    ['advancementPoolByRelationship'] as const,
    ['eventRounds'] as const,
  ];
}

export function workspaceGameSaveQueryKeys(eventId: number) {
  return [
    ['squadGames'] as const,
    ['eventComplete', eventId] as const,
    ['eventChampionshipResults', eventId] as const,
    ['advancementPoolByRelationship'] as const,
    ['eventRounds'] as const,
    ['roundRealTimeStatus', eventId] as const,
  ];
}
