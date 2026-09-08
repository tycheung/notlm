export interface VisualParticipantOption {
  id: number;
  kind?: 'team' | 'participant';
  userId?: number | null;
  squadId?: number | null;
  eventParticipantId?: number | null;
  handicap?: number | null;
  teamMembers?: Array<{
    event_participant_id?: number | null;
    user_id?: number | null;
    display_name?: string | null;
  }>;
  label: string;
}

export interface VisualMatchDraft {
  id: string;
  seriesId?: number;
  label: string;
  displayOrder: number;
  sideAId: number | null;
  sideBId: number | null;
  sideAName: string;
  sideBName: string;
  winsA: number;
  winsB: number;
  winnerSide: 0 | 1 | null;
  x: number;
  y: number;
  podLabel?: string | null;
  bracketRound?: number | null;
  bracketSlot?: number | null;
  feederASeriesId?: number | null;
  feederBSeriesId?: number | null;
  bracketSegment?: string | null;
  feederLoserASeriesId?: number | null;
  feederLoserBSeriesId?: number | null;
}

export interface VisualDraftModel {
  matches: VisualMatchDraft[];
  participants: VisualParticipantOption[];
}

export type VisualFormat = 'bracket' | 'stepladder' | 'round_robin' | 'pods';

export interface VisualPersistencePayload {
  canPersist: boolean;
  reason?: string;
  fullTree?: boolean;
  orderedSeeds?: number[];
  bracketMode?: 'single_elimination' | 'double_elimination';
  pairings?: Array<[number | null, number | null]>;
  createRows?: Array<{
    display_order: number;
    match_label: string | null;
    side_0: { event_participant_id?: number | null; team_id?: number | null };
    side_1: { event_participant_id?: number | null; team_id?: number | null };
  }>;
}
