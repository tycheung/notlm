import type { ReactNode } from 'react';
import type { TemporaryGameMetadata } from '../../hooks/useTemporaryGames';
import type { SquadRead } from '../../types/squad';
import type { GameUpdate } from '../../types/game';
import type { MatchSeriesRead } from '../../api/round-match-series';
import type { AdvancementDestinationMap } from '../../utils/advancementDestinations';

export type CompetitionMethod =
  | 'eliminator'
  | 'bracket'
  | 'stepladder'
  | 'round_robin'
  | 'pods';

export interface FormatScoringSurfaceProps {
  method: CompetitionMethod;
  isTeamEvent: boolean;
  squadCategories: any[];
  gameCount: number;
  /** Relationships whose target_round is this round (for carry-over, etc.). */
  incomingRelationships?: any[];
  advancementDestinationMap: AdvancementDestinationMap;
  onGameScoreChange: (gameId: number, field: keyof GameUpdate, value: unknown) => void;
  onTemporaryGameScoreChange: (
    metadata: TemporaryGameMetadata,
    field: keyof GameUpdate,
    value: unknown
  ) => string;
  pendingGameChanges: Record<number, GameUpdate>;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (categoryId: string) => void;
  isLoadingSquadParticipants: boolean;
  loadingGames: boolean;
  getCurrentRoundGameCount: () => number;
  getPendingGameValue: (gameId: number | string, field: keyof GameUpdate) => unknown;
  hasGamePendingChanges: (gameId: number | string) => boolean;
  getParticipantGames: (participantId: number) => any[];
  getGameIdForParticipantAndGameNumber: (
    participantId: number,
    gameNumber: number
  ) => number | null;
  getTeamGames: (teamId: number) => any[];
  getTeamGameIdForTeamAndGameNumber: (teamId: number, gameNumber: number) => number | null;
  allGames: any[];
  squads: SquadRead[];
  tabMode: 'horizontal' | 'vertical';
  participantSortOrder?: import('../../utils/scoringParticipantSort').ScoringParticipantSortOrder;
  teamScoringMode: 'individual' | 'mixed' | 'team';
  /** Baker: one shared team score; member scores never recorded / never average. */
  isBakerRound?: boolean;
  handicapEnabled: boolean;
  handicapBaseScore: number;
  handicapPercentage: number;
  selectedRoundId: number | null;
  eventId?: number;
  matchSeries: MatchSeriesRead[];
  isLoadingMatchSeries: boolean;
  roundParticipants: any[];
  seedingFallbackTooltip?: string | null;
  /** From round `competition_method_config.bracket_mode` when method is bracket. */
  bracketMode?: 'single_elimination' | 'double_elimination' | null;
  /** From round `competition_method_config.pod_size` when method is pods. */
  podSize?: number | null;
  /** 1-based seed lists per pod from round config. */
  podMembership?: number[][] | null;
  advanceBySize?: Record<string, number> | null;
  /** League RR: 1-based position round game from config. */
  positionRoundGame?: number | null;
  /** League RR: scheduled games count from config. */
  scheduledGames?: number | null;
  /**
   * Optional server carry map: relationship id -> entity id string -> totals.
   * When present, carry cells prefer `total_pinfall` as scratch carry display.
   */
  carryOverTotalsByRelationshipId?: Record<
    number,
    { by_event_participant_id?: Record<string, { total_pinfall?: number; total_score?: number }>; by_team_id?: Record<string, { total_pinfall?: number; total_score?: number }> }
  >;
  /** +/- game count controls (eliminator scoring tab only). */
  gameCountAdjustControls?: ReactNode;
  /** Per-game lane labels keyed by `${squad_participant_id}:${game_number}`. */
  laneLabelLookup?: Map<string, string>;
  /**
   * Baker / league: movement-preview lanes by team id (index = gameNumber - 1).
   * Used on Entry score cells when shells do not yet carry assigned_lane.
   */
  previewLanesByTeamId?: Map<number, Array<number | null>>;
  /** Standings place by team id (for position-round lane display). */
  standingPlaceByTeamId?: Map<number, number>;
  positionRoundLanePlacement?: string | null;
  pairsInPlay?: Array<[number, number]> | null;
  /** When true, show Bonus Pins column on team score sheets. */
  bonusPinsEnabled?: boolean;
  /** Accumulated match-play bonus pins keyed by team id. */
  bonusPinsByTeamId?: Map<number, number> | Record<number, number>;
}
