export type ScoringVisualRow = {
  event_participant_id?: number | null;
  participant_id?: number | null;
  team_id?: number | null;
  user_name?: string | null;
  display_name?: string | null;
  team_name?: string | null;
  team_members?: Array<{
    event_participant_id?: number | null;
    team_member_id?: number | null;
    user_id?: number | null;
    display_name?: string | null;
  }>;
  can_edit: boolean;
  squad_locked_in: boolean;
  identity_kind: 'team' | 'participant';
  identity_id: number;
  advancement_position: number;
  row_source: 'assigned_roster' | 'advancement_pool' | 'advancement_pool_team';
  canonical_order: number;
};

export type ScoringVisualDiagnostics = {
  mergedCount: number;
  rosterCount: number;
  poolSinglesCount: number;
  poolTeamsCount: number;
  incomingRound: boolean;
  orderSource: string;
  orderedEntrantCount: number;
  seriesCount: number;
  hasMatchSeries: boolean;
  structureState: string;
  unassignedSlots: number;
  fallbackReasons: string[];
};

type OrderedEntrant = {
  event_participant_id?: number | null;
  team_id?: number | null;
  pool_position?: number | null;
};

type OrderedDiagnostics = {
  order_source?: string | null;
  ordered_entrant_count?: number | null;
  series_count?: number | null;
  has_match_series?: boolean | null;
  structure_state?: string | null;
  unassigned_slots?: number | null;
  fallback_reasons?: string[] | null;
};

/** Build canonical order map from ordered entrants API response. */
function buildCanonicalOrderByKey(orderedEntrants: OrderedEntrant[]): Map<string, number> {
  const canonicalOrderByKey = new Map<string, number>();
  orderedEntrants.forEach((entry) => {
    const participantKey = entry?.event_participant_id
      ? `p:${Number(entry.event_participant_id)}`
      : null;
    const teamKey = entry?.team_id ? `t:${Number(entry.team_id)}` : null;
    const rank = Number(entry?.pool_position ?? Number.MAX_SAFE_INTEGER);
    if (participantKey && !canonicalOrderByKey.has(participantKey)) {
      canonicalOrderByKey.set(participantKey, rank);
    }
    if (teamKey && !canonicalOrderByKey.has(teamKey)) {
      canonicalOrderByKey.set(teamKey, rank);
    }
  });
  return canonicalOrderByKey;
}

/**
 * Merge scoring roster + advancement pool singles/teams for non-eliminator surfaces.
 * Dedupes by team/participant key after lock/edit/canonical/advancement sort.
 */
export function buildScoringVisualParticipants(input: {
  orderedEntrants?: OrderedEntrant[] | null;
  scoringRosterParticipants?: any[] | null;
  unassignedParticipants?: any[] | null;
  poolTeamsForRound?: any[] | null;
}): ScoringVisualRow[] {
  const canonicalOrderByKey = buildCanonicalOrderByKey(input.orderedEntrants || []);

  const fromRoster = (input.scoringRosterParticipants || []).map((row: any) => ({
    event_participant_id: row.event_participant_id ?? null,
    participant_id: row.event_participant_id ?? null,
    team_id: row.team_id ?? null,
    user_name: row.user_name ?? row.display_name ?? null,
    display_name: row.display_name ?? row.user_name ?? row.team_name ?? null,
    team_name: row.team_name ?? null,
    team_members: Array.isArray(row.team_members) ? row.team_members : undefined,
    can_edit: Boolean(row.can_edit),
    squad_locked_in: Boolean(row.squad_locked_in),
    identity_kind: (row.team_id ? 'team' : 'participant') as 'team' | 'participant',
    identity_id: Number(
      row.team_id ?? row.event_participant_id ?? row.participant_id ?? Number.MAX_SAFE_INTEGER
    ),
    advancement_position: Number(
      row.advancement_position ?? row.entry_number ?? Number.MAX_SAFE_INTEGER
    ),
    row_source: 'assigned_roster' as const,
    canonical_order: Number(
      canonicalOrderByKey.get(
        row.team_id
          ? `t:${Number(row.team_id)}`
          : `p:${Number(row.event_participant_id ?? row.participant_id)}`
      ) ?? Number.MAX_SAFE_INTEGER
    ),
  }));

  const fromPoolSingles = (input.unassignedParticipants || []).map((p: any) => ({
    event_participant_id: p.id ?? p.event_participant_id ?? null,
    participant_id: p.id ?? p.event_participant_id ?? null,
    team_id: p.team_id ?? null,
    user_name: p.user_name ?? null,
    display_name: p.display_name ?? p.user_name ?? null,
    team_name: p.team_name ?? null,
    can_edit: false,
    squad_locked_in: false,
    identity_kind: (p.team_id ? 'team' : 'participant') as 'team' | 'participant',
    identity_id: Number(p.team_id ?? p.id ?? p.event_participant_id ?? Number.MAX_SAFE_INTEGER),
    advancement_position: Number(p.advancement_position ?? Number.MAX_SAFE_INTEGER),
    row_source: 'advancement_pool' as const,
    canonical_order: Number(
      canonicalOrderByKey.get(
        p.team_id
          ? `t:${Number(p.team_id)}`
          : `p:${Number(p.id ?? p.event_participant_id)}`
      ) ?? Number.MAX_SAFE_INTEGER
    ),
  }));

  const fromPoolTeams = (input.poolTeamsForRound || []).map((team: any) => ({
    team_id: team.id ?? null,
    display_name: team.display_name || team.team_name || `Team ${team.team_number ?? team.id}`,
    team_name: team.team_name || team.display_name || null,
    user_name: team.display_name || team.team_name || null,
    can_edit: false,
    squad_locked_in: false,
    identity_kind: 'team' as const,
    identity_id: Number(team.id ?? Number.MAX_SAFE_INTEGER),
    advancement_position: Number(team.advancement_position ?? Number.MAX_SAFE_INTEGER),
    row_source: 'advancement_pool_team' as const,
    canonical_order: Number(
      canonicalOrderByKey.get(`t:${Number(team.id)}`) ?? Number.MAX_SAFE_INTEGER
    ),
  }));

  const merged = [...fromRoster, ...fromPoolSingles, ...fromPoolTeams].sort((a, b) => {
    // Prefer stable team aggregate rows (team_name / team_members) over individual members
    // that share the same team_id — otherwise match diagrams show "Hawley Test4" instead of
    // "Team Hawley".
    const teamAggDiff =
      Number(Boolean(b?.team_id && (b.team_name || b.team_members?.length))) -
      Number(Boolean(a?.team_id && (a.team_name || a.team_members?.length)));
    if (teamAggDiff !== 0) return teamAggDiff;
    const lockDiff = Number(Boolean(b?.squad_locked_in)) - Number(Boolean(a?.squad_locked_in));
    if (lockDiff !== 0) return lockDiff;
    const editableDiff = Number(Boolean(b?.can_edit)) - Number(Boolean(a?.can_edit));
    if (editableDiff !== 0) return editableDiff;
    const canonicalDiff =
      Number(a?.canonical_order ?? Number.MAX_SAFE_INTEGER) -
      Number(b?.canonical_order ?? Number.MAX_SAFE_INTEGER);
    if (canonicalDiff !== 0) return canonicalDiff;
    const advancementDiff =
      Number(a?.advancement_position ?? Number.MAX_SAFE_INTEGER) -
      Number(b?.advancement_position ?? Number.MAX_SAFE_INTEGER);
    if (advancementDiff !== 0) return advancementDiff;
    return (
      Number(a?.identity_id ?? Number.MAX_SAFE_INTEGER) -
      Number(b?.identity_id ?? Number.MAX_SAFE_INTEGER)
    );
  });

  const membersByTeamId = new Map<
    number,
    NonNullable<ScoringVisualRow['team_members']>
  >();
  for (const row of merged) {
    const teamId = Number(row.team_id);
    const epId = Number(row.event_participant_id ?? row.participant_id);
    if (!Number.isFinite(teamId) || teamId <= 0) continue;
    if (!Number.isFinite(epId) || epId <= 0) continue;
    const list = membersByTeamId.get(teamId) ?? [];
    if (!list.some((member) => Number(member.event_participant_id) === epId)) {
      list.push({
        event_participant_id: epId,
        display_name: row.display_name ?? row.user_name ?? null,
      });
      membersByTeamId.set(teamId, list);
    }
  }

  const seen = new Set<string>();
  return merged
    .filter((row) => {
      const key = row?.team_id
        ? `t:${row.team_id}`
        : `p:${row?.event_participant_id ?? row?.participant_id}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((row) => {
      const teamId = Number(row.team_id);
      const harvested = Number.isFinite(teamId) ? membersByTeamId.get(teamId) : undefined;
      if (!harvested?.length) return row;
      const existing = Array.isArray(row.team_members) ? row.team_members : [];
      const hasLinkedMembers = existing.some(
        (member) => Number(member.event_participant_id) > 0
      );
      if (hasLinkedMembers) return row;
      return { ...row, team_members: harvested };
    });
}

export function buildScoringVisualDiagnostics(input: {
  rows: ScoringVisualRow[];
  hasIncomingRelationships: boolean;
  orderedDiagnostics?: OrderedDiagnostics | null;
}): ScoringVisualDiagnostics {
  const rows = input.rows || [];
  const ordered = input.orderedDiagnostics;
  return {
    mergedCount: rows.length,
    rosterCount: rows.filter((r) => r.row_source === 'assigned_roster').length,
    poolSinglesCount: rows.filter((r) => r.row_source === 'advancement_pool').length,
    poolTeamsCount: rows.filter((r) => r.row_source === 'advancement_pool_team').length,
    incomingRound: input.hasIncomingRelationships,
    orderSource: ordered?.order_source ?? 'client_merge',
    orderedEntrantCount: Number(ordered?.ordered_entrant_count ?? 0),
    seriesCount: Number(ordered?.series_count ?? 0),
    hasMatchSeries: Boolean(ordered?.has_match_series ?? false),
    structureState: String(ordered?.structure_state ?? 'unknown'),
    unassignedSlots: Number(ordered?.unassigned_slots ?? 0),
    fallbackReasons: Array.isArray(ordered?.fallback_reasons) ? ordered.fallback_reasons : [],
  };
}

export function deriveScoringEmptyReason(input: {
  scoringSurface: boolean;
  participants: ScoringVisualRow[];
  isLoading: boolean;
  hasIncomingRelationships: boolean;
  diagnostics: ScoringVisualDiagnostics;
}): string | null {
  if (!input.scoringSurface) return null;
  if ((input.participants || []).length > 0) return null;
  if (input.isLoading) return null;

  if (input.hasIncomingRelationships) {
    const fallbackText =
      input.diagnostics.fallbackReasons.length > 0
        ? input.diagnostics.fallbackReasons.join('|')
        : 'none';
    const diagnosticsSummary = [
      `roster=${input.diagnostics.rosterCount}`,
      `poolSingles=${input.diagnostics.poolSinglesCount}`,
      `poolTeams=${input.diagnostics.poolTeamsCount}`,
      `orderedEntrants=${input.diagnostics.orderedEntrantCount}`,
      `orderSource=${input.diagnostics.orderSource}`,
      `series=${input.diagnostics.seriesCount}`,
      `hasMatchSeries=${input.diagnostics.hasMatchSeries}`,
      `structureState=${input.diagnostics.structureState}`,
      `unassignedSlots=${input.diagnostics.unassignedSlots}`,
      `fallbacks=${fallbackText}`,
    ].join(', ');
    return `No assigned roster or advancement pool candidates are visible for this round yet. (${diagnosticsSummary})`;
  }

  return `No assigned roster entries are visible yet. Add participants or teams to squads for this round. (roster=${input.diagnostics.rosterCount})`;
}
