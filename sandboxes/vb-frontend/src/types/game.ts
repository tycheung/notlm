// Frame Data Schema for detailed frame info (display metadata; does not derive score)
export interface FrameData {
  frame: number;
  first_ball: string;
  second_ball?: string | null;
  third_ball?: string | null; // Only for 10th frame
  is_strike: boolean;
  is_spare: boolean;
}

export type GameStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'verified'
  | 'rejected'
  | 'cancelled';

// Game Types
export interface GameBase {
  game_number: number;
  round_id?: number | null;
  squad_id?: number | null;
  user_id: number;
  event_participant_id: number;
  squad_participant_id?: number | null;
  score: number | null; // null indicates unscored shell
  handicap?: number | null;
  total_score?: number | null;
  status?: GameStatus;

  // Optional frame metadata (not used to compute scratch score)
  frame_by_frame?: string | null;
  strikes?: number | null;
  spares?: number | null;
  opens?: number | null;
  splits?: number | null;
  splits_converted?: number | null;

  notes?: string | null;
  verified: boolean;
  verified_by?: number | null;
  rejection_reason?: string | null;

  // Team scoring (also on GameRead)
  team_id?: number | null;
  is_team_game?: boolean;
  is_baker?: boolean;
  parent_game_id?: number | null;
  assigned_lane?: number | null;
}

export interface GameCreate extends GameBase {}

export interface GameUpdate {
  game_number?: number;
  round_id?: number | null;
  squad_id?: number | null;
  user_id?: number;
  event_participant_id?: number;
  squad_participant_id?: number | null;
  score?: number | null;
  handicap?: number | null;
  total_score?: number | null;
  status?: GameStatus;
  frame_by_frame?: string | null;
  strikes?: number | null;
  spares?: number | null;
  opens?: number | null;
  splits?: number | null;
  splits_converted?: number | null;
  notes?: string | null;
  verified?: boolean;
  verified_by?: number | null;
  rejection_reason?: string | null;
}

export interface GameRead extends GameBase {
  id: number;
  created_at: string; // ISO format datetime
  updated_at?: string | null;

  is_complete: boolean;
  is_shell: boolean;

  team_id?: number | null;
  is_team_game?: boolean;
  /** Baker shared team score — excluded from individual averages */
  is_baker?: boolean;
  parent_game_id?: number | null;
  /** Optional display name when API joins user */
  user_name?: string | null;
}

export interface GameWithFrames extends GameRead {
  frames: FrameData[];
}

/** Metadata-only frame write payload (does not recalculate score). */
export interface FrameDataUpdate {
  frame_by_frame: string;
  strikes?: number;
  spares?: number;
  opens?: number;
  splits?: number;
  splits_converted?: number;
}

export interface BatchGameCreate {
  games: GameCreate[];
}

export interface TemporaryGameShellData {
  temp_id: string;
  event_participant_id: number;
  squad_participant_id?: number | null;
  team_id?: number | null;
  user_id: number;
  game_number: number;
  round_id?: number | null;
  squad_id?: number | null;
  team_game_id?: number | null;
  is_team_game: boolean;
  is_baker?: boolean;
  score?: number | null;
  handicap?: number | null;
  match_series_id?: number | null;
  match_game_index?: number | null;
}

export interface BulkScoreUpdate {
  game_id: number;
  score?: number | null;
  handicap?: number | null;
  match_series_id?: number | null;
  match_game_index?: number | null;
}

export interface TeamMemberScoreUpdate {
  team_game_id: number;
  event_participant_id: number;
  score: number;
  temp_id?: string;
  round_id?: number | null;
  squad_id?: number | null;
  team_id?: number | null;
  game_number?: number | null;
}

export interface TeamMemberScoreBatchRequest {
  team_member_scores: TeamMemberScoreUpdate[];
}

export interface UnifiedBatchGameRequest {
  temporary_shells: TemporaryGameShellData[];
  game_updates: BulkScoreUpdate[];
  team_member_scores?: TeamMemberScoreUpdate[];
}

export interface UnifiedBatchGameResponse {
  success: boolean;
  message: string;
  created_games: GameRead[];
  updated_games: GameRead[];
  temp_id_mapping: Record<string, number>;
  errors: Array<Record<string, unknown>>;
}
