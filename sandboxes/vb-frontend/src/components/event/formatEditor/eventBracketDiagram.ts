import type { MatchSeriesRead } from '../../../api/round-match-series';
import type { EventTeamRead } from '../../../types/event_team';
import { buildDoubleElimDiagram } from '../../match-play-diagram/adapters/bracketDoubleElim';
import { buildSingleElimDiagram } from '../../match-play-diagram/adapters/bracketSingleElim';
import type {
  DiagramAdapterContext,
  DiagramMatch,
  TournamentDiagramModel,
} from '../../match-play-diagram/adapters/types';

export type EventBracketMode = 'single_elimination' | 'double_elimination';

export interface EventBracketDiagramInput {
  matchSeries: MatchSeriesRead[];
  isTeamEvent: boolean;
  bracketMode?: EventBracketMode | null;
  teams?: EventTeamRead[];
  participants?: Array<{ event_participant_id: number; user_name?: string | null }>;
}

export function rosterRows(
  isTeamEvent: boolean,
  teams: EventTeamRead[] | undefined,
  participants: EventBracketDiagramInput['participants']
): any[] {
  if (isTeamEvent) {
    return (teams || []).map((team) => ({
      team_id: team.id,
      team_name: team.display_name || team.team_name || `Team ${team.id}`,
      display_name: team.display_name || team.team_name,
    }));
  }
  return (participants || []).map((row) => ({
    event_participant_id: row.event_participant_id,
    user_name: row.user_name,
    display_name: row.user_name,
  }));
}

export function stripUnscoredBoxes(match: DiagramMatch): DiagramMatch {
  const hasScore = match.participants.some((p) =>
    (p.scores || []).some((s) => s.score != null)
  );
  if (hasScore) return match;
  return {
    ...match,
    participants: [
      { ...match.participants[0], scores: [] },
      { ...match.participants[1], scores: [] },
    ],
  };
}

export function fieldSizeFromModel(model: TournamentDiagramModel): number | null {
  const opening =
    model.sections?.[0]?.columns[0]?.matches.length ?? model.columns[0]?.matches.length ?? 0;
  if (opening <= 0) return null;
  return opening * 2;
}

export function buildEventBracketDiagramModel(
  input: EventBracketDiagramInput
): TournamentDiagramModel {
  const isDouble = input.bracketMode === 'double_elimination';
  const ctx: DiagramAdapterContext = {
    matchSeries: input.matchSeries,
    roundParticipants: rosterRows(input.isTeamEvent, input.teams, input.participants),
    allGames: [],
    isTeamEvent: input.isTeamEvent,
    maxGameCount: 1,
    bracketMode: isDouble ? 'double_elimination' : 'single_elimination',
  };
  return isDouble ? buildDoubleElimDiagram(ctx) : buildSingleElimDiagram(ctx);
}
