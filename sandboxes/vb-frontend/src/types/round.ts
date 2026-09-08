import { ScoreType, TiebreakerRule } from './round_enums';
import type { AdvancementMethod, AdvancementMethodConfig } from './roundRelationship';
import { GameRead } from './game';
import { EventRead } from './event';
import type { SquadRead } from './squad';

// Round Format Types
export interface RoundFormatBase {
  fresh?: boolean;
  name: string;
  team_size?: number;
  games_count: number;
  score_type: ScoreType;
  round_tiebreaker_rules: TiebreakerRule;
  options: Record<string, any>;
}

export interface RoundFormatCreate extends RoundFormatBase {}

export interface RoundFormatUpdate {
  fresh?: boolean;
  name?: string;
  team_size?: number;
  games_count?: number;
  score_type?: ScoreType;
  round_tiebreaker_rules?: TiebreakerRule;
  options?: Record<string, any>;
}

export interface RoundFormatRead extends RoundFormatBase {
  id: number;
  created_at: string;
  updated_at?: string;
}

// Round Types
export interface RoundBase {
  round_number: number;
  friendly_name?: string | null;
  event_id: number;
  format_id: number;
  game_count: number;
  number_of_squads: number;
  status: string;
  notes?: string | null;
  
  // Re-entry configuration
  allows_reentry: boolean;
  max_reentries?: number | null;
  reentry_fee?: number | null;
  reserved_lanes_expression?: string | null;
  merge_resolution_mode?: 'ranking_based' | 'source_priority' | null;
  merge_source_priority_relationship_ids?: number[] | null;
  merge_resolution_score_basis?: 'advancement' | 'scratch_pinfall' | 'with_handicap' | null;
  merge_resolution_tiebreaker_rule?: 'highest_game' | 'highest_last_game' | 'head_to_head' | null;

  competition_method?: AdvancementMethod;
  competition_method_config?: AdvancementMethodConfig | null;
}

export interface RoundCreate extends RoundBase {}

export interface RoundUpdate {
  round_number?: number;
  friendly_name?: string | null;
  event_id?: number;
  format_id?: number;
  game_count?: number;
  number_of_squads?: number;
  status?: string;
  notes?: string | null;
  allows_reentry?: boolean;
  max_reentries?: number | null;
  reentry_fee?: number | null;
  reserved_lanes_expression?: string | null;
  merge_resolution_mode?: 'ranking_based' | 'source_priority' | null;
  merge_source_priority_relationship_ids?: number[] | null;
  merge_resolution_score_basis?: 'advancement' | 'scratch_pinfall' | 'with_handicap' | null;
  merge_resolution_tiebreaker_rule?: 'highest_game' | 'highest_last_game' | 'head_to_head' | null;
  competition_method?: AdvancementMethod;
  competition_method_config?: AdvancementMethodConfig | null;
}

export interface RoundRead extends RoundBase {
  id: number;
  created_at: string;
  updated_at?: string | null;
  /** True when every squad in the round is locked in (derived / legacy bulk lock). */
  locked_in?: boolean;
}

export interface RoundWithGames extends RoundRead {
  games: GameRead[];
}

export interface RoundWithFormat extends RoundRead {
  format: RoundFormatRead;
}

export interface RoundWithSquads extends RoundRead {
  squads: SquadRead[];
}

export interface RoundWithEvent extends RoundRead {
  event: EventRead;
}

export interface RoundSummary {
  round_id: number;
  event_id: number;
  round_number: number;
  status: string;
  game_count: number;
  total_participants: number;
  high_game: number;
  high_game_user_id: number;
  high_game_user_name: string;
  high_series: number;
  high_series_user_id: number;
  high_series_user_name: string;
  average_score: number;
}

export interface RoundParticipant {
  round_id: number;
  user_id: number;
  user_name: string;
  event_participant_id: number;
  team_id?: number | null;
  team_name?: string | null;
  total_score: number;
  total_pinfall: number;
  /** Match-format bonus pins when the round awards win/tie/loss bonuses. */
  bonus_pins?: number;
  handicap?: number | null;
  highest_single_game: number;
  highest_scratch_game: number;
  highest_handicap_game: number;
  lowest_single_game: number;
  position: number;
  is_advancing?: boolean;
  is_reentry?: boolean;
  match_wins?: number | null;
  match_display_order?: number | null;
  match_series_id?: number | null;
  series_record?: string | null;
  is_match_play?: boolean;
  elimination_rank?: number | null;
  last_loss_display_order?: number | null;
  last_win_display_order?: number | null;
  is_elimination_champion?: boolean;
  qualifying_average?: number | null;
}

export interface RoundFlowStatus {
  round_id: number;
  round_number: number;
  status: string;
  is_initial_round: boolean;
  is_final_round: boolean;
  can_start: boolean;
  predecessor_count: number;
  flow_type: 'initial' | 'final' | 'intermediate';
}

export interface LockedDependentRound {
  round_id: number;
  round_number: number;
  friendly_name: string | null;
  game_count: number;
  squad_count: number;
}

export interface RoundEditabilityStatus {
  round_id: number;
  round_number: number;
  friendly_name: string | null;
  can_edit: boolean;
  locked_dependent_rounds: LockedDependentRound[];
  reason: string;
}

export interface AdvancementPoolResetResponse {
  message: string;
  round_id: number;
  details: {
    message: string;
    entries_removed: number;
  };
}