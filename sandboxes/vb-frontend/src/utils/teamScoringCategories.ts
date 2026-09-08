import type { SquadRead } from '../types/squad';
import {
  defaultStartingLaneSortKey,
  scoringParticipantDisplayName,
  sortScoringParticipants,
  type ScoringParticipantSortOrder,
} from './scoringParticipantSort';

export type TeamScoringSquadCategory<T> = {
  id: string;
  name: string;
  participants: T[];
  scoringSquadId?: number;
  advanceCount?: number;
};

export function resolveTeamScoringCategorySquadId(category: {
  id: string;
  scoringSquadId?: number;
}): number {
  if (typeof category.scoringSquadId === 'number' && Number.isFinite(category.scoringSquadId)) {
    return category.scoringSquadId;
  }
  const parsed = parseInt(category.id, 10);
  return Number.isNaN(parsed) ? NaN : parsed;
}

export function isTeamScoringCategoryLockedIn(
  category: { id: string; scoringSquadId?: number },
  squads: SquadRead[]
): boolean {
  if (category.id === 'unassigned') return false;
  const n = resolveTeamScoringCategorySquadId(category);
  if (Number.isNaN(n)) return false;
  return Boolean(squads.find((s) => s.id === n)?.locked_in);
}

export function sortTeamScoringSquadCategories<T extends { id: number }>(
  squadCategories: Array<TeamScoringSquadCategory<T>>,
  participantSortOrder: ScoringParticipantSortOrder,
  options?: {
    laneLabelLookup?: Map<string, string>;
    previewLanesByTeamId?: Map<number, Array<number | null>>;
  }
): Array<TeamScoringSquadCategory<T>> {
  const laneLabelLookup = options?.laneLabelLookup;
  const previewLanesByTeamId = options?.previewLanesByTeamId;
  return squadCategories.map((category) => ({
    ...category,
    participants: sortScoringParticipants(category.participants, participantSortOrder, {
      laneLabelLookup,
      getStartingLaneKey: (team) => {
        const name = scoringParticipantDisplayName(team as Record<string, unknown>);
        const previewLane = previewLanesByTeamId?.get(team.id)?.[0];
        if (previewLane != null && Number.isFinite(Number(previewLane))) {
          return { lane: Number(previewLane), slot: null, name };
        }
        return defaultStartingLaneSortKey(team as Record<string, unknown>, laneLabelLookup);
      },
    }),
  }));
}
