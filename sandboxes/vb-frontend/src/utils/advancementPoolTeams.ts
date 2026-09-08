import { EventTeamWithMembers } from '../types/event_team';

/** Metadata when a team appears in the advancement pool (one row per member in API). */
export interface PoolTeamMetadata {
  is_pool_team: true;
  pool_entry_ids: number[];
  advancement_position: number;
  advancement_criteria_type: string;
  advancement_criteria_value: number;
  advancement_relationship_id: number;
  source_round_id: number;
  target_round_id: number;
}

export type EventTeamWithPoolMeta = EventTeamWithMembers & Partial<PoolTeamMetadata>;

/**
 * Map EventParticipant.id -> EventTeam.id for all members across registered teams.
 */
export function buildEventParticipantIdToTeamIdMap(
  teams: EventTeamWithMembers[]
): Map<number, number> {
  const m = new Map<number, number>();
  for (const team of teams) {
    if (!team?.id || !team.members?.length) continue;
    for (const member of team.members) {
      const epId = member.event_participant_id;
      if (epId != null) {
        m.set(Number(epId), team.id);
      }
    }
  }
  return m;
}

/**
 * Fallback map when event_participant_id is missing on team members.
 * Uses User.id -> EventTeam.id.
 */
function buildUserIdToTeamIdMap(teams: EventTeamWithMembers[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const team of teams) {
    if (!team?.id || !team.members?.length) continue;
    for (const member of team.members) {
      if (member?.user_id != null) {
        m.set(Number(member.user_id), team.id);
      }
    }
  }
  return m;
}

/**
 * Build one team object per team that appears in the advancement pool for the target round.
 * Mirrors singles: pool lists people; for teams we group member rows by team_id.
 */
export function buildPoolTeamsForRound(
  allPoolParticipants: any[],
  teams: EventTeamWithMembers[],
  selectedRoundId: number,
  incomingRelationships: Array<{ id: number }>
): EventTeamWithPoolMeta[] {
  if (!allPoolParticipants?.length || !teams?.length || !selectedRoundId) {
    return [];
  }

  const epToTeam = buildEventParticipantIdToTeamIdMap(teams);
  const userToTeam = buildUserIdToTeamIdMap(teams);
  const teamById = new Map<number, EventTeamWithMembers>(
    teams.map((t) => [t.id, t])
  );

  const relationshipIds = new Set(
    (incomingRelationships || []).map((r) => Number(r.id)).filter(Boolean)
  );

  const roundPoolRows = allPoolParticipants.filter(
    (p: any) => p && Number(p.target_round_id) === Number(selectedRoundId)
  );
  const effectiveRelationshipIds =
    relationshipIds.size > 0
      ? relationshipIds
      : new Set(
          roundPoolRows
            .map((p: any) => Number(p.advancement_relationship_id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        );

  const poolRows = roundPoolRows.filter(
    (p: any) =>
      p &&
      (effectiveRelationshipIds.size === 0 ||
        effectiveRelationshipIds.has(Number(p.advancement_relationship_id)))
  );

  const byTeam = new Map<number, any[]>();
  for (const row of poolRows) {
    const epId = row.event_participant_id;
    const teamId =
      (epId != null ? epToTeam.get(Number(epId)) : undefined) ??
      (row.user_id != null ? userToTeam.get(Number(row.user_id)) : undefined);
    if (teamId == null) continue;
    if (!byTeam.has(teamId)) byTeam.set(teamId, []);
    byTeam.get(teamId)!.push(row);
  }

  const out: EventTeamWithPoolMeta[] = [];
  for (const [teamId, rows] of byTeam) {
    const base = teamById.get(teamId);
    if (!base || rows.length === 0) continue;
    rows.sort(
      (a, b) => (a.advancement_position ?? 0) - (b.advancement_position ?? 0)
    );
    const first = rows[0];
    out.push({
      ...base,
      is_pool_team: true,
      pool_entry_ids: rows.map((r: any) => r.id),
      advancement_position: first.advancement_position,
      advancement_criteria_type: first.advancement_criteria_type,
      advancement_criteria_value: first.advancement_criteria_value,
      advancement_relationship_id: first.advancement_relationship_id,
      source_round_id: first.source_round_id,
      target_round_id: first.target_round_id
    });
  }

  out.sort(
    (a, b) =>
      (a.advancement_position ?? 0) - (b.advancement_position ?? 0) ||
      a.team_number - b.team_number
  );

  return out;
}
