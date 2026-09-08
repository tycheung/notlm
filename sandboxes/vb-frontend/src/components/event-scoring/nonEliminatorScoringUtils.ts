export interface TeamMemberLike {
  event_participant_id?: number | null;
  user_id?: number | null;
  display_name?: string | null;
}

export type RelationshipBasis = 'scratch' | 'handicap';

export function resolvePersistedTeamMemberScore(
  allGames: any[],
  parentTeamGameId: number | null,
  eventParticipantId: number
): number | null {
  if (!parentTeamGameId || !Array.isArray(allGames)) return null;
  const game = allGames.find(
    (g) =>
      Number(g.parent_game_id ?? g.parentGameId ?? 0) === Number(parentTeamGameId) &&
      Number(g.event_participant_id ?? 0) === Number(eventParticipantId)
  );
  return typeof game?.score === 'number' ? game.score : null;
}

function resolveRelationshipBasis(relationship: any | null): RelationshipBasis {
  const raw = String(
    relationship?.score_basis ?? relationship?.advancement_score_basis ?? 'scratch'
  ).toLowerCase();
  return raw === 'handicap' ? 'handicap' : 'scratch';
}

export type CarryOverTotalsBlock = {
  by_event_participant_id?: Record<string, { total_pinfall?: number; total_score?: number }>;
  by_team_id?: Record<string, { total_pinfall?: number; total_score?: number }>;
};

/**
 * Server carry map value for the incoming relationship's score basis:
 * scratch → total_pinfall, handicap → total_score (aligned with RoundService carry rows).
 */
export function pickServerCarryPreferredTotal(
  map: Record<number, CarryOverTotalsBlock> | undefined,
  relationship: any,
  sideEntityId: number,
  isTeamEvent: boolean
): number | null {
  const rid = Number(relationship?.id);
  if (!map || !Number.isFinite(rid)) return null;
  const block = map[rid];
  if (!block) return null;
  const key = String(sideEntityId);
  const row = isTeamEvent ? block.by_team_id?.[key] : block.by_event_participant_id?.[key];
  if (!row) return null;
  const basis = resolveRelationshipBasis(relationship);
  const field = basis === 'handicap' ? 'total_score' : 'total_pinfall';
  const raw = row[field as keyof typeof row];
  if (raw == null || !Number.isFinite(Number(raw))) return null;
  return Number(raw);
}

/**
 * Client-side carry-over: sum scratch `score` in `sourceRoundId` for team or participant.
 * When `serverPreferredScratch` is set, that value is shown instead.
 */
export function sumCarryScoresFromSourceRound(
  allGames: any[],
  sourceRoundId: number,
  sideEntityId: number,
  isTeamEvent: boolean,
  serverPreferred?: number | null,
  relationship?: any | null
): string | null {
  if (serverPreferred != null && Number.isFinite(Number(serverPreferred))) {
    return String(Math.round(Number(serverPreferred)));
  }
  const basis = resolveRelationshipBasis(relationship);
  let sum = 0;
  let any = false;
  for (const g of allGames || []) {
    if (Number(g.round_id ?? g.roundId) !== Number(sourceRoundId)) continue;
    if (isTeamEvent && Number(g.team_id) === Number(sideEntityId) && g.is_team_game) {
      const add =
        basis === 'handicap'
          ? Number(g.total_score ?? g.totalScore ?? g.score ?? 0) || 0
          : Number(g.score ?? 0) || 0;
      sum += add;
      any = true;
    }
    if (!isTeamEvent && Number(g.event_participant_id) === Number(sideEntityId) && !g.is_team_game) {
      const add =
        basis === 'handicap'
          ? Number(g.total_score ?? g.totalScore ?? g.score ?? 0) || 0
          : Number(g.score ?? 0) || 0;
      sum += add;
      any = true;
    }
  }
  return any ? String(sum) : null;
}
