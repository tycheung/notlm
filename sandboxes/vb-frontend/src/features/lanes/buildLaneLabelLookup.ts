import type { LaneScoreSheetRow } from './types';

export function buildLaneLabelLookup(rows: LaneScoreSheetRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const label =
      row.lane_label ??
      (row.assigned_lane != null ? String(row.assigned_lane) : null);
    if (!label) continue;
    map.set(`${row.squad_participant_id}:${row.game_number}`, label);
  }
  return map;
}

export function resolveLaneLabelForGame(
  lookup: Map<string, string> | undefined,
  squadParticipantId: number | null | undefined,
  gameNumber: number,
  game?: { assigned_lane?: number | null; lane_label?: string | null }
): string | null {
  if (game?.lane_label) return game.lane_label;
  if (game?.assigned_lane != null) return String(game.assigned_lane);
  if (!lookup || squadParticipantId == null) return null;
  return lookup.get(`${squadParticipantId}:${gameNumber}`) ?? null;
}
