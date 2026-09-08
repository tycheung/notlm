import { RoundRead } from './round';

export enum AdvancementFilter {
  WINNERS = "winners",
  LOSERS = "losers",
  ALL = "all",
  TOP_N = "top_n",
  BOTTOM_N = "bottom_n",
  RANGE = "range",
  TOP_N_PER_SQUAD = "top_n_per_squad",
  TOP_N_PER_SQUAD_AT_LARGE = "top_n_per_squad_at_large",
}

export enum DuplicateAdvancementPolicy {
  ALLOW_MULTIPLE = "allow_multiple",
  SINGLE_AND_PROMOTE = "single_and_promote",
  SINGLE_NO_BACKFILL = "single_no_backfill",
}

export enum AdvancementMethod {
  ELIMINATOR = "eliminator",
  STEPLADDER = "stepladder",
  BRACKET = "bracket",
  ROUND_ROBIN = "round_robin",
  PODS = "pods",
}

/** Per-round bowling style + DYLG (stored on competition_method_config). */
export interface RoundGameScoringConfig {
  /** How games are bowled; orthogonal to match_play vs pinfall score_type. */
  game_style?: 'standard' | 'baker';
  dylg_enabled?: boolean;
  dylg_scope?: 'individual' | 'team' | null;
  dylg_drop_count?: number | null;
}

export interface EliminatorConfig extends RoundGameScoringConfig {
  selection_mode?: "count" | "percentage";
  game_count?: number;
  lane_strategy?: "seeded" | "random" | "manual";
}

export interface StepladderConfig extends RoundGameScoringConfig {
  game_count?: number;
  /**
   * race_to_wins = best-of / race-to match play;
   * games_total = bowl all games, winner by series pinfall total.
   */
  series_decision_mode?: 'race_to_wins' | 'games_total';
  /** Used when series_decision_mode is race_to_wins. */
  race_to_wins?: number;
  placement_resolution_mode?: "stats" | "playoff_matches";
  seed_source_round_id?: number | null;
  seed_source_mode?: 'feeder' | 'round' | 'all_rounds' | null;
}

export interface BracketConfig extends RoundGameScoringConfig {
  game_count?: number;
  series_decision_mode?: 'race_to_wins' | 'games_total';
  race_to_wins?: number;
  bracket_mode?: "single_elimination" | "double_elimination";
  bye_count?: number;
  bye_criteria?:
    | "highest_pinfall_overall"
    | "highest_handicap_total"
    | "highest_average"
    | "highest_handicap_average"
    | "highest_single_game"
    | "highest_scratch_game"
    | "highest_handicap_game"
    | "highest_last_game"
    | "head_to_head"
    | "manual";
  placement_resolution_mode?: "stats" | "playoff_matches";
  /** Double elimination: if the losers-bracket champion wins the first grand final, add a reset match. */
  grand_final_reset?: boolean;
  /**
   * How entrants map onto traditional seed slots:
   * by_seed | random | manual (shells only; TD assigns).
   */
  seed_mode?: 'by_seed' | 'random' | 'manual';
  /**
   * When set with by_seed, reorder survivors by this ancestor round's totals
   * (e.g. original qualifying) instead of the immediate feeder finish.
   */
  seed_source_round_id?: number | null;
  seed_source_mode?: 'feeder' | 'round' | 'all_rounds' | null;
}

export interface RoundRobinConfig extends RoundGameScoringConfig {
  /** league = USBC weeks (default); pairwise = legacy all-vs-all. */
  schedule_mode?: 'league' | 'pairwise';
  /** Number of scheduled games / league weeks. */
  scheduled_games?: number;
  /** @deprecated Prefer scheduled_games. */
  total_matches_or_games?: number;
  game_count?: number;
  games_per_match?: number;
  series_decision_mode?: 'race_to_wins' | 'games_total';
  race_to_wins?: number;
  /** 1-based game index replaced by standings position round (1v2, 3v4…). */
  position_round_game?: number | null;
  position_round_lane_placement?:
    | 'random'
    | 'start_low'
    | 'start_high'
    | 'start_middle';
  bonus_pins?: { win: number; tie: number; loss: number };
  placement_resolution_mode?: "stats" | "playoff_matches";
  seed_source_round_id?: number | null;
  seed_source_mode?: 'feeder' | 'round' | 'all_rounds' | null;
}

export interface PodsConfig extends RoundGameScoringConfig {
  /** Legacy single size; treated as pod_size_max. */
  pod_size?: number;
  pod_size_min?: number;
  pod_size_max?: number;
  /** Target average pod size for even remainder mix (within min–max). */
  preferred_pod_size?: number | null;
  /** Per size → how many advance from a pod of that size. */
  advance_by_size?: Record<string, number>;
  balance_mode?: 'by_seed' | 'random' | 'manual';
  remainder_mode?: 'even' | 'prefer_max';
  /** 1-based seed lists per pod. */
  pod_membership?: number[][] | null;
  game_count?: number;
  series_decision_mode?: 'race_to_wins' | 'games_total';
  race_to_wins?: number;
  /** Legacy; ignored for pairing generation. */
  games_before_elimination?: number;
  placement_resolution_mode?: "stats" | "playoff_matches";
  seed_source_round_id?: number | null;
  seed_source_mode?: 'feeder' | 'round' | 'all_rounds' | null;
}

export type AdvancementMethodConfig =
  | EliminatorConfig
  | StepladderConfig
  | BracketConfig
  | RoundRobinConfig
  | PodsConfig;

export interface RoundRelationshipBase {
  source_round_id: number;
  target_round_id?: number | null;
  final_node_id?: number | null;
  advancement_filter: AdvancementFilter;
  
  // Advancement count/percentage - how many advance
  advancement_count?: number;
  advancement_percentage?: number;
  min_advancement_count?: number;
  /** At-large slots after per-squad cuts (top_n_per_squad_at_large only). */
  at_large_advancement_count?: number;
  
  // Advancement criteria - how to rank/sort participants
  advancement_type?: string;
  tiebreaker_rule?: string;
  /** Ranking basis for average-style criteria: scratch pinfall vs handicap totals */
  advancement_score_basis?: 'scratch' | 'handicap' | null;
  carry_over_enabled?: boolean;
  /** Final payout: source round totals vs cumulative event totals. */
  advancement_score_scope?: 'source_round' | 'all_rounds' | null;

  delay_rounds: number;
  description?: string;
  is_active: boolean;
  execution_order: number;
  duplicate_advancement_policy?: DuplicateAdvancementPolicy;
}

export interface RoundRelationshipCreate extends RoundRelationshipBase {}

export interface RoundRelationshipUpdate {
  source_round_id?: number;
  target_round_id?: number | null;
  final_node_id?: number | null;
  advancement_filter?: AdvancementFilter;
  advancement_count?: number;
  advancement_percentage?: number;
  min_advancement_count?: number | null;
  at_large_advancement_count?: number | null;
  advancement_type?: string;
  tiebreaker_rule?: string;
  advancement_score_basis?: 'scratch' | 'handicap' | null;
  carry_over_enabled?: boolean;
  advancement_score_scope?: 'source_round' | 'all_rounds' | null;
  delay_rounds?: number;
  description?: string;
  is_active?: boolean;
  execution_order?: number;
  duplicate_advancement_policy?: DuplicateAdvancementPolicy;
}

export interface RoundRelationshipRead extends RoundRelationshipBase {
  id: number;
  created_at: string;
  updated_at?: string;
}

export interface RoundRelationshipWithRounds extends RoundRelationshipRead {
  source_round?: RoundRead;
  target_round?: RoundRead;
  final_node?: {
    id: number;
    name: string;
    event_id: number;
  };
}

export interface AdvancementPreview {
  relationship_id: number;
  advancement_filter: AdvancementFilter;
  advancing_participant_ids: number[];
  advancing_participant_count: number;
  total_participants: number;
}

// Tournament flow visualization types
export interface TournamentFlowNode {
  round_id: number;
  round_number: number;
  round_name?: string;
  status: string;
  participant_count: number;
  advancement_count: number;
  is_initial: boolean;
  is_final: boolean;
  position_x?: number;
  position_y?: number;
  has_game_conflict?: boolean;
  merge_resolution_mode?: string | null;
  merge_source_priority_relationship_ids?: number[] | null;
  competition_method?: AdvancementMethod;
  competition_method_config?: AdvancementMethodConfig | null;
}

export interface TournamentFlowEdge {
  id: number;
  source_round_id: number;
  target_round_id?: number;
  final_node_id?: number;
  advancement_filter: AdvancementFilter;
  advancement_count?: number | null;
  advancement_percentage?: number | null;
  min_advancement_count?: number | null;
  at_large_advancement_count?: number | null;
  advancement_type?: string;
  tiebreaker_rule?: string;
  advancement_score_basis?: 'scratch' | 'handicap' | null;
  advancement_score_scope?: 'source_round' | 'all_rounds' | null;
  delay_rounds?: number;
  participant_count: number;
  description: string;
  is_active: boolean;
  execution_order?: number;
  duplicate_advancement_policy?: DuplicateAdvancementPolicy;
}

export interface TournamentFlow {
  event_id: number;
  nodes: TournamentFlowNode[];
  edges: TournamentFlowEdge[];
}

// UI-specific types for the flow diagram
export interface FlowNodePosition {
  x: number;
  y: number;
}

export interface FlowDiagramNode extends TournamentFlowNode {
  position: FlowNodePosition;
  selected?: boolean;
  dragging?: boolean;
}

export interface FlowDiagramEdge extends TournamentFlowEdge {
  sourcePosition: FlowNodePosition;
  targetPosition: FlowNodePosition;
  selected?: boolean;
}

export interface TournamentFlowDiagram {
  event_id: number;
  nodes: FlowDiagramNode[];
  edges: FlowDiagramEdge[];
  scale: number;
  offset: { x: number; y: number };
} 