import type { MatchSeriesParticipant } from '../../../../api/round-match-series';
import type { VisualParticipantOption } from '../types';

/**
 * Canonical visual slot id for a persisted match side — must match `buildParticipantOptions`
 * (`team_id` before `event_participant_id`) and bracket seed extraction.
 */
export function matchSideSlotId(side: MatchSeriesParticipant | undefined): number | null {
  if (!side) return null;
  const raw = side.team_id ?? side.event_participant_id;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Resolve roster option for a match side id (team id, member event_participant_id, or singles id).
 */
export function findParticipantOptionBySideId(
  participants: VisualParticipantOption[],
  sideId: number | null | undefined
): VisualParticipantOption | undefined {
  if (sideId == null) return undefined;
  const n = Number(sideId);
  if (!Number.isFinite(n) || n <= 0) return undefined;

  for (const p of participants) {
    if (Number(p.id) === n) return p;
  }
  for (const p of participants) {
    const ep = p.eventParticipantId;
    if (ep != null && Number(ep) === n) return p;
  }
  for (const p of participants) {
    if ((p.teamMembers || []).some((m) => Number(m.event_participant_id ?? 0) === n)) return p;
  }
  return undefined;
}

function isTeamAggregateRow(row: any): boolean {
  if (row?.team_id == null) return false;
  if (Array.isArray(row.team_members) && row.team_members.length > 0) return true;
  if (row.team_name) return true;
  // Scoring-roster team rows omit event_participant_id; member rows include it.
  return row.event_participant_id == null && row.participant_id == null;
}

function resolveOptionLabel(row: any, id: number): string {
  if (row?.team_id != null) {
    return String(
      row.team_name ||
        (isTeamAggregateRow(row) ? row.display_name : null) ||
        row.name ||
        `Team ${id}`
    );
  }
  return String(
    row.user_name ||
      row.display_name ||
      row.team_name ||
      row.name ||
      `Participant ${id}`
  );
}

function optionQuality(row: any): number {
  let score = 0;
  if (isTeamAggregateRow(row)) score += 4;
  if (row?.team_name) score += 2;
  if (Array.isArray(row?.team_members) && row.team_members.length > 0) score += 1;
  return score;
}

export function buildParticipantOptions(roundParticipants: any[]): VisualParticipantOption[] {
  const map = new Map<number, VisualParticipantOption>();
  const rankById = new Map<number, number>();
  const qualityById = new Map<number, number>();
  roundParticipants.forEach((row) => {
    const id = Number(row.team_id ?? row.participant_id ?? row.event_participant_id);
    if (!Number.isFinite(id)) return;
    const rank = Number(
      row.seed_rank ??
        row.canonical_order ??
        row.pool_position ??
        row.advancement_position ??
        Number.MAX_SAFE_INTEGER
    );
    if (!rankById.has(id)) {
      rankById.set(id, rank);
    }
    const quality = optionQuality(row);
    const existing = map.get(id);
    if (existing && (qualityById.get(id) ?? 0) >= quality) {
      // Keep a stronger team aggregate; still merge members if this row has them.
      if (
        (!existing.teamMembers || existing.teamMembers.length === 0) &&
        Array.isArray(row.team_members) &&
        row.team_members.length > 0
      ) {
        map.set(id, { ...existing, teamMembers: row.team_members });
      }
      return;
    }
    qualityById.set(id, quality);
    map.set(id, {
      id,
      kind: row.team_id ? 'team' : 'participant',
      userId: row.user_id ?? row.userId ?? null,
      squadId: row.squad_id ?? null,
      eventParticipantId:
        row.event_participant_id ?? row.eventParticipantId ?? row.participant_id ?? null,
      teamMembers: Array.isArray(row.team_members) ? row.team_members : existing?.teamMembers || [],
      handicap: row.handicap ?? null,
      label: resolveOptionLabel(row, id),
    });
  });
  return [...map.values()].sort((a, b) => {
    const ar = Number(rankById.get(a.id) ?? Number.MAX_SAFE_INTEGER);
    const br = Number(rankById.get(b.id) ?? Number.MAX_SAFE_INTEGER);
    if (ar !== br) return ar - br;
    return a.id - b.id;
  });
}
