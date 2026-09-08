import type { MatchSeriesRead } from '../../../api/round-match-series';
import type { AdvancementDestination } from '../../../utils/advancementDestinations';

export type DiagramLayout = 'bracket' | 'stepladder' | 'grid' | 'pods';

export interface DiagramScoreCell {
  gameIndex: number;
  score: number | null;
  gameId: number | null;
  disabled: boolean;
}

export interface DiagramParticipant {
  side: 0 | 1;
  name: string;
  sideId: number | null;
  isWinner: boolean;
  isTbd: boolean;
  scores: DiagramScoreCell[];
  carryOverValue?: number | null;
  advancementDestinations?: AdvancementDestination[];
  teamMembers?: Array<{
    event_participant_id?: number | null;
    display_name?: string | null;
  }>;
}

export interface DiagramMatch {
  id: string;
  seriesId: number;
  label: string | null;
  status: string;
  winsSide0: number;
  winsSide1: number;
  winnerSide: 0 | 1 | null;
  maxGames: number;
  raceToWins: number;
  slotIndex: number;
  feederAIndex: number | null;
  feederBIndex: number | null;
  bracketSegment?: string | null;
  podLabel?: string | null;
  participants: [DiagramParticipant, DiagramParticipant];
}

export interface DiagramColumn {
  key: string;
  header: string;
  matches: DiagramMatch[];
}

export interface DiagramSection {
  key: string;
  label: string;
  columns: DiagramColumn[];
}

export interface TournamentDiagramModel {
  layout: DiagramLayout;
  title: string;
  subtitle?: string;
  columns: DiagramColumn[];
  sections?: DiagramSection[];
  rosterChips?: Array<{ seat: number; label: string }>;
}

export interface DiagramAdapterContext {
  matchSeries: MatchSeriesRead[];
  roundParticipants: any[];
  allGames: any[];
  isTeamEvent: boolean;
  maxGameCount: number;
  bracketMode?: 'single_elimination' | 'double_elimination' | null;
  podSize?: number | null;
}

export interface DiagramGridMatch {
  id: string;
  seriesId: number;
  sideAId: number | null;
  sideBId: number | null;
  sideAName: string;
  sideBName: string;
  winsA: number;
  winsB: number;
  winnerSide: 0 | 1 | null;
  displayOrder: number;
}

export function diagramMatchesToGridDraft(matches: DiagramMatch[]): DiagramGridMatch[] {
  return matches.map((m, idx) => ({
    id: m.id,
    seriesId: m.seriesId,
    sideAId: m.participants[0].sideId,
    sideBId: m.participants[1].sideId,
    sideAName: m.participants[0].name,
    sideBName: m.participants[1].name,
    winsA: m.winsSide0,
    winsB: m.winsSide1,
    winnerSide: m.winnerSide,
    displayOrder: idx,
  }));
}

export function flattenDiagramMatches(model: TournamentDiagramModel): DiagramMatch[] {
  if (model.sections?.length) {
    return model.sections.flatMap((s) => s.columns.flatMap((c) => c.matches));
  }
  return model.columns.flatMap((c) => c.matches);
}
