/**
 * Stable temporary game id for individual (non-team) games, including team member rows.
 * Must stay in sync with useTemporaryGames generateTempId.
 */
export function getIndividualTempGameId(params: {
  event_participant_id: number;
  game_number: number;
  squad_participant_id?: number | null;
}): string {
  const base = `temp-individual-${params.event_participant_id}-${params.game_number}`;
  if (params.squad_participant_id != null && params.squad_participant_id !== undefined) {
    return `${base}-sp-${params.squad_participant_id}`;
  }
  return base;
}
