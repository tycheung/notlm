import { TournamentRead } from './tournament';
import { RoundWithSquads } from './round';
import { SquadRead } from './squad';

// Team format enums
export enum EventFormat {
  SINGLES = 'singles',
  TEAMS = 'teams'
}

export enum TeamScoringMethod {
  SUM_ALL = 'sum_all',
  SUM_BEST_N = 'sum_best_n'
}

export enum DYLGScope {
  INDIVIDUAL = 'individual',
  TEAM = 'team'
}

export enum TeamHandicapMethod {
  SUM_INDIVIDUAL = 'sum_individual',
  PERCENTAGE_OF_BASE = 'percentage_of_base'
}

export enum DuplicateCashingPolicy {
  ALLOW_MULTIPLE = 'allow_multiple',
  SINGLE_AND_PROMOTE = 'single_and_promote',
}

export interface EventBase {
  name: string;
  tournament_id: number;
  start_date: string; // ISO format date
  end_date: string; // ISO format date
  
  // Event specific configuration
  handicap_base_score: number;
  handicap_percentage: number;
  entry_fee?: number | null;
  max_entries?: number | null;
  description?: string | null;
  rules?: string | null;
  registration_deadline?: string | null; // ISO format date
  
  // Re-entry configuration
  allows_reentry: boolean;
  max_reentries?: number | null;
  reentry_fee?: number | null;
  
  // Team format support
  event_format: EventFormat;
  team_size?: number | null;
  allow_individual_reentries: boolean;
  allow_team_reentries: boolean;
  
  // Team scoring options
  team_scoring_method?: TeamScoringMethod | null;
  dylg_enabled: boolean;
  dylg_scope?: DYLGScope | null;
  
  // Team handicap calculation
  team_handicap_method?: TeamHandicapMethod | null;
  team_handicap_percentage?: number | null;
  team_handicap_base?: number | null;
  
  // Event Format Configuration - number_of_rounds is calculated from actual rounds
  
  // Prize fund (place payouts are on final nodes only)
  house_cut_percentage: number;
  house_cut_amount?: number | null;
  house_cut_type: 'percentage' | 'dollars_per_entry' | 'amount';
  additional_prize_pool?: number | null;
  lineage_fee_mode?: 'flat' | 'per_game';
  lineage_per_game?: number;
  lineage_amount?: number;
  lineage_billed_games?: number | null;
  duplicate_cashing_policy?: DuplicateCashingPolicy;
  /** When false (default), only participants + TD see prize fund dollars */
  display_prize_fund_public?: boolean;
  reserved_lanes_expression?: string | null;
}

export interface EventCreate extends EventBase {
  created_by?: number | null;
}

export interface EventUpdate {
  name?: string;
  start_date?: string;
  end_date?: string;
  handicap_base_score?: number;
  handicap_percentage?: number;
  entry_fee?: number | null;
  max_entries?: number | null;
  description?: string | null;
  rules?: string | null;
  is_active?: boolean;
  registration_deadline?: string | null;
  allows_reentry?: boolean;
  max_reentries?: number | null;
  reentry_fee?: number | null;
  
  // Team format updates
  event_format?: EventFormat;
  team_size?: number | null;
  allow_individual_reentries?: boolean;
  allow_team_reentries?: boolean;
  team_scoring_method?: TeamScoringMethod | null;
  dylg_enabled?: boolean;
  dylg_scope?: DYLGScope | null;
  team_handicap_method?: TeamHandicapMethod | null;
  team_handicap_percentage?: number | null;
  team_handicap_base?: number | null;

  house_cut_percentage?: number;
  house_cut_amount?: number | null;
  house_cut_type?: 'percentage' | 'dollars_per_entry' | 'amount';
  additional_prize_pool?: number | null;
  lineage_fee_mode?: 'flat' | 'per_game';
  lineage_per_game?: number;
  lineage_amount?: number;
  lineage_billed_games?: number | null;
  duplicate_cashing_policy?: DuplicateCashingPolicy;
  display_prize_fund_public?: boolean;
  updated_by?: number | null;
}

export interface EventRead extends EventBase {
  id: number;
  created_at: string; // ISO format datetime
  updated_at?: string | null; // ISO format datetime
  is_active: boolean;
  current_entries: number;
  created_by?: number | null;
  updated_by?: number | null;
  number_of_rounds: number; // Calculated property from backend
  /** Set when TD publishes; public page requires this */
  published_at?: string | null;
  /** Set when TD marks event complete after all rounds are done */
  completed_at?: string | null;
  /**
   * Sticky: set when the first game score is recorded. Locks start_date edits
   * even if scores are later cleared/deleted.
   */
  scoring_started_at?: string | null;
  /** True = TD closed sign-ups; False = open (subject to schedule + dates) */
  signups_manually_closed?: boolean;
  /** Optional automatic open time (ISO); backend enforces */
  signup_scheduled_open_at?: string | null;
  /** True hides save-format sharing for non-owner viewers */
  hide_event_format_sharing?: boolean;
  final_nodes_completed?: boolean;
  final_nodes?: FinalNodeRead[];
  /** False when pool split or payout steps cannot be fully resolved for dollar amounts */
  prize_settings_valid?: boolean;
  prize_validation_error?: string | null;
  /** False for spectators when public prize-fund toggle is off (entry fee still shown). */
  prize_fund_details_visible?: boolean;
}

/** PATCH /events/:id/registration-settings */
export interface EventRegistrationSettingsUpdate {
  publish?: boolean;
  unpublish?: boolean;
  complete?: boolean;
  signups_manually_closed?: boolean;
  signup_scheduled_open_at?: string | null;
  hide_event_format_sharing?: boolean;
}

export interface EventWithTournament extends EventRead {
  tournament: TournamentRead;
}

export interface EventWithRounds extends EventRead {
  rounds: RoundWithSquads[];
}

export interface EventWithSquads extends EventRead {
  squads: SquadRead[];
}

export interface EventComplete extends EventRead {
  tournament: TournamentRead;
  rounds: RoundWithSquads[];
}

export interface EventRegistration {
  event_id: number;
  user_id: number;
  entry_number: number;
  entry_fee_paid: boolean;
  notes?: string | null;
}

/** Public singles sign-up (optional auth via axios). */
export interface PublicEventRegistration {
  event_id: number;
  first_name?: string | null;
  last_name?: string | null;
  usbc_id?: string | null;
  entry_number?: number;
  entry_fee_paid?: boolean;
  notes?: string | null;
}

// EventParticipantWithUser moved to event_participant.ts to avoid duplicates
export type { EventParticipantWithUser } from './event_participant';

export interface EventStats {
  event_id: number;
  event_name: string;
  total_games: number;
  total_participants: number;
  highest_score: number;
  highest_score_user_id?: number | null;
  highest_score_user_name: string;
  average_score: number;
  total_strikes: number;
  total_spares: number;
  perfect_games: number;
} 

export interface EventLockInResponse {
  message: string;
  event_id: number;
  games_created: number;
  participants_processed: number;
  squads_processed: number;
  warning?: {
    dependent_rounds_affected: number;
    dependent_rounds: Array<{
      round_id: number;
      round_number: number;
      friendly_name: string | null;
      leads_to_round: number;
    }>;
    message: string;
  };
} 

export interface ChampionshipWinnerIdentity {
  user_id?: number | null;
  event_participant_id?: number | null;
  team_id?: number | null;
  display_name?: string | null;
}

export interface ChampionshipPlacement {
  id: number;
  event_id: number;
  final_node_id: number;
  source_round_id: number;
  placement: number;
  criteria_type: string;
  criteria_value: number;
  tiebreaker_rule: string;
  winner: ChampionshipWinnerIdentity;
  team_members: ChampionshipWinnerIdentity[];
  standings_label?: string | null;
  global_standings_rank?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ChampionshipResultsResponse {
  event_id: number;
  final_node_id?: number | null;
  source_round_id?: number | null;
  placements: ChampionshipPlacement[];
}

export type PrizeAllocationMode =
  | 'fixed_amount'
  | 'percent_of_slice'
  | 'percent_of_remainder'
  | 'remainder';

export interface PrizeAllocationStep {
  place: number;
  place_end?: number | null;
  mode: PrizeAllocationMode;
  value?: number | null;
}

export interface FinalNodeRead {
  id: number;
  event_id: number;
  name: string;
  description?: string | null;
  display_order: number;
  include_in_standings: boolean;
  is_active: boolean;
  placement_count: number;
  node_pool_type: 'percentage' | 'dollars_per_entry' | 'amount';
  node_pool_value: number;
  prize_allocation_steps: PrizeAllocationStep[];
  created_at: string;
  updated_at?: string | null;
}

export interface FinalNodeResults {
  final_node_id: number;
  final_node_name: string;
  include_in_standings?: boolean;
  source_round_id?: number | null;
  placements: ChampionshipPlacement[];
}

export interface ChampionshipResultsByNodeResponse {
  event_id: number;
  final_nodes: FinalNodeResults[];
}

export interface EventPrizeDistributionItem {
  position: string;
  position_label?: string | null;
  global_standings_rank?: number | null;
  percentage?: number | null;
  amount?: number | null;
  is_custom_label_only?: boolean;
}

export interface EventPrizeDistributionMergedItem extends EventPrizeDistributionItem {
  winner?: ChampionshipWinnerIdentity | null;
  team_members?: ChampionshipWinnerIdentity[];
  championship_criteria_type?: string | null;
  championship_criteria_value?: number | null;
}

export interface EventPrizeDistributionResponse {
  event_id: number;
  total_prize_pool: number;
  house_cut_percentage: number;
  house_cut_amount?: number | null;
  house_cut_type: string;
  participant_count: number;
  entry_fee?: number | null;
  duplicate_cashing_policy?: DuplicateCashingPolicy;
  prize_settings_valid?: boolean;
  prize_validation_error?: string | null;
  distribution_by_node: Record<string, Record<string, EventPrizeDistributionItem>>;
  merged_distribution_by_node: Record<string, Record<string, EventPrizeDistributionMergedItem>>;
  championship_results: ChampionshipResultsByNodeResponse;
  duplicate_resolution_by_node?: Record<string, Array<{
    reason: string;
    winner?: ChampionshipWinnerIdentity | null;
    team_members?: ChampionshipWinnerIdentity[];
    original_placement?: number | null;
  }>>;
}

export interface FinalPayoutsRow extends ChampionshipPlacement {
  amount: number;
  position_label?: string | null;
}

export interface FinalPayoutsNode {
  final_node_id: number;
  final_node_name: string;
  display_order?: number;
  include_in_standings?: boolean;
  average_payout_per_bowler: number;
  total_payout: number;
  rows: FinalPayoutsRow[];
}

export interface FinalNodeStandingsConfigItem {
  final_node_id: number;
  display_order: number;
  include_in_standings: boolean;
}

export interface FinalPayoutsResponse {
  event_id: number;
  prize_settings_valid?: boolean;
  prize_validation_error?: string | null;
  final_nodes: FinalPayoutsNode[];
}

/** Per-game row for round live scores modal (read-only) */
export interface RoundLiveGameRow {
  game_number: number;
  score: number | null;
  handicap: number | null;
  total_score: number | null;
  verified: boolean;
  status: string;
  is_team_game: boolean;
  dylg_dropped?: boolean;
  dylg_candidate?: boolean;
}

export interface RoundLiveParticipantRow {
  participant_id: number;
  user_id?: number | null;
  display_name: string;
  games: RoundLiveGameRow[];
  total_score: number;
  total_pinfall?: number;
}

export interface RoundLiveMemberRow {
  participant_id: number;
  user_id?: number | null;
  display_name: string;
  games: RoundLiveGameRow[];
  total_score: number;
  total_pinfall?: number;
}

export interface RoundLiveTeamRow {
  team_id: number;
  label: string;
  games: RoundLiveGameRow[];
  total_score: number;
  total_pinfall?: number;
  members: RoundLiveMemberRow[];
  match_wins?: number;
  match_losses?: number;
  match_ties?: number;
  bonus_pins?: number;
  series_record?: string;
  total_with_bonus?: number;
}

export interface RoundLiveSquad {
  id: number;
  name: string;
  status: string;
  participants?: RoundLiveParticipantRow[];
  teams?: RoundLiveTeamRow[];
}

export interface RoundLiveMatchSide {
  side: number;
  team_id: number | null;
  event_participant_id: number | null;
  display_name: string;
}

export interface RoundLiveMatchGamesByIndex {
  match_game_index: number;
  games: RoundLiveGameRow[];
}

export interface RoundLiveMatchBlock {
  id: number;
  label: string | null;
  race_to_wins: number;
  max_games: number;
  wins_side_0: number;
  wins_side_1: number;
  status: string;
  winner_side: number | null;
  bracket_template: string | null;
  sides: RoundLiveMatchSide[];
  games_by_index: RoundLiveMatchGamesByIndex[];
}

export interface EventRoundLiveScoresSnapshot {
  event_id: number;
  round_id: number;
  updated_at: string;
  version: string;
  round: {
    id: number;
    round_number: number;
    friendly_name: string;
    status: string;
    game_count: number;
    /** Stage competition style (eliminator, bracket, stepladder, …). */
    competition_method?: string | null;
  } | null;
  event_format: string | null;
  competition_mode?: 'aggregate' | 'match_play';
  /** Baker shared team score — members should not repeat pinfall. */
  is_baker?: boolean;
  /** RR schedule source: league | pairwise | … */
  schedule_mode?: string | null;
  /** True when format awards match bonus pins. */
  includes_bonus?: boolean;
  matches?: RoundLiveMatchBlock[];
  squads: RoundLiveSquad[];
}

export interface EventRoundLiveScoresStreamMessage {
  type: 'snapshot' | 'heartbeat';
  event_id: number;
  round_id: number;
  version: string;
  payload?: EventRoundLiveScoresSnapshot;
}

export interface PendingSignupEventRead {
  event_id: number;
  event_name: string;
  tournament_id: number;
  tournament_name: string;
  pending_count: number;
}