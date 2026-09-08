export type LaneOccupancyMode = 'single_lane' | 'doubles_across';
export type LaneAssignmentMode = 'manual' | 'auto_batch' | 'auto_checkin';
export type LaneMovementMode =
  | 'stay'
  | 'move_right'
  | 'move_left'
  | 'expand'
  | 'staggered'
  | 'league';

export type LanePair = [number, number];

export interface LaneMovementConfig {
  enabled: boolean;
  interval_games: number;
  mode: LaneMovementMode;
  step_pairs: number;
  staggered_steps: number[];
  league_team_count: number | null;
  /** Random 1..pairCount shift applied each time the USBC schedule wraps. */
  league_wrap_pair_offset: number | null;
  /**
   * When true, wrap stays inside the low half (through split_after_pair_low)
   * or the high half (after it) instead of wrapping across the whole house.
   */
  split_house: boolean;
  /** Low lane of the last pair in the low half (e.g. 19 for pair 19-20). */
  split_after_pair_low: number | null;
}

export interface LaneEngineConfig {
  pairs_in_play: LanePair[];
  lanes_in_play: number[];
  lanes_in_play_expression: string;
  occupancy_mode: LaneOccupancyMode;
  assignment_mode: LaneAssignmentMode;
    even_fill: boolean;
    max_per_lane: number;
    /** When false, bowlers always see “not assigned” for lane/pair. Default off. */
    assignments_public?: boolean;
    movement: LaneMovementConfig;
}

export interface EventLaneManagementResponse {
  event_id: number;
  is_override: boolean;
  tournament_defaults: Record<string, unknown>;
  event_override: Record<string, unknown> | null;
  effective: Record<string, unknown> & Partial<LaneEngineConfig>;
  engine: LaneEngineConfig;
  center_lane_count: number | null;
  effective_reserved_lanes: number[];
  squads_updated?: number;
}

export interface LaneBoardAssignment {
  squad_participant_id: number;
  squad_id: number;
  event_participant_id: number;
  user_id?: number | null;
  display_name: string;
  assigned_lane: number | null;
  lane_slot?: number | null;
  lane_label?: string | null;
  checked_in?: boolean;
  pair_label?: string;
  is_reentry?: boolean;
  lane_group_id?: string | null;
  /** Present for team / Baker seats so previews collapse to one row per team. */
  team_id?: number | null;
  pair_conflict?: boolean;
  pair_conflict_warnings?: Array<{
    code: string;
    severity: string;
    message: string;
    pair_low?: number;
    pair_high?: number;
  }>;
}

export interface LaneBoardLane {
  lane: number;
  pair_low: number;
  pair_high: number;
  pair_label: string;
  assignments: LaneBoardAssignment[];
  occupancy: number;
  capacity: number;
  over_capacity: boolean;
  outside_pairs_in_play?: boolean;
}

export interface LaneAssignmentBoardResponse {
  event_id: number;
  round_id: number | null;
  squad_id: number | null;
  pair_source?: string;
  engine: LaneEngineConfig;
  pairs_in_play: LanePair[];
  lanes_in_play: number[];
  max_per_lane: number;
  lanes: LaneBoardLane[];
  unassigned: LaneBoardAssignment[];
  warnings: Array<{ code: string; severity: string; message: string; lane?: number }>;
  squads: Array<{ id: number; name: string; game_count?: number }>;
}

export interface ApplyLaneAssignmentsPayload {
  assignments: Array<{
    squad_participant_id: number;
    assigned_lane: number | null;
    lane_slot?: number | null;
  }>;
}

export interface ApplyLaneAssignmentsResponse {
  event_id: number;
  updated_assignments: number;
  skipped_assignments: number;
  errors: Array<{ row_index: number; squad_participant_id: number; error: string }>;
  stamp_result?: { stamped_games: number; participants: number } | null;
  warnings?: Array<{ code: string; severity: string; message: string }>;
}

export interface AutoBatchLaneAssignmentPayload {
  round_id?: number;
  squad_id?: number;
  strategy?: 'alpha' | 'entry' | 'random';
  unassigned_only?: boolean;
  checked_in_only?: boolean;
  persist?: boolean;
}

export interface AutoBatchLaneAssignmentResponse {
  event_id: number;
  round_id: number | null;
  squad_id: number | null;
  assignments: Array<{
    squad_participant_id: number;
    assigned_lane: number;
    lane_slot?: number;
  }>;
  overflow_units: Array<{
    display_name: string;
    squad_participant_ids: number[];
    team_id?: number | null;
  }>;
  warnings: Array<{ code: string; severity: string; message: string }>;
  summary: {
    strategy: string;
    units_placed?: number;
    units_overflow?: number;
    assignments_count?: number;
    capacity_units?: number;
    checked_in_only?: boolean;
  };
  persisted: boolean;
  apply_result?: ApplyLaneAssignmentsResponse;
  stamp_result?: { stamped_games: number; participants: number } | null;
}

export interface StampLaneGamesPayload {
  round_id?: number;
  squad_id?: number;
}

export interface StampLaneGamesResponse {
  event_id: number;
  stamped_games: number;
  participants: number;
  team_games_stamped?: number;
  position_games_stamped?: number;
}

export interface CopyLanesFromRoundPayload {
  source_round_id: number;
  target_round_id: number;
  stamp?: boolean;
}

export interface CopyLanesFromRoundResponse {
  event_id: number;
  source_round_id: number;
  target_round_id: number;
  updated_assignments: number;
  skipped_assignments: number;
  stamp_result?: StampLaneGamesResponse | null;
}

export interface LaneScoreSheetRow {
  event_participant_id: number;
  squad_participant_id: number;
  squad_id: number;
  game_number: number;
  assigned_lane: number | null;
  lane_slot?: number | null;
  lane_label?: string | null;
  display_name: string;
}

export interface LaneScoreSheetResponse {
  event_id: number;
  round_id: number;
  rows: LaneScoreSheetRow[];
}
