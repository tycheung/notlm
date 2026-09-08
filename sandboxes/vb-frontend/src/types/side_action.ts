// Enum for side action types
export enum SideActionType {
  BRACKET = 'bracket',
  HIGH_GAME = 'high_game',
  HIGH_SET = 'high_set',
  ELIMINATOR = 'eliminator',
  MYSTERY_DOUBLES = 'mystery_doubles',
  MYSTERY_GAME = 'mystery_game',
  LOVE_DOUBLES = 'love_doubles',
  ALIBI_DOUBLES = 'alibi_doubles',
}

// Enum for side action status (matches backend SideActionStatus)
export enum SideActionStatus {
  DRAFT = 'draft',
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

export type SideActionSquadScopeMode = 'all' | 'selected';

export interface SideActionPoolOverride {
  game_numbers?: number[];
  entry_fee?: number;
  house_cut_type?: 'percentage' | 'dollars_per_entry' | 'amount';
  house_cut_percentage?: number;
  house_cut_amount?: number | null;
  prize_distribution?: Record<string, number>;
  prize_type?: 'percentage' | 'amount' | 'dollars_per_entry';
  type_config?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SideActionPool {
  id: number;
  side_action_id: number;
  squad_id: number;
  squad_name: string;
  is_enabled: boolean;
  status: SideActionStatus;
  override_config: SideActionPoolOverride;
  game_numbers: number[];
  entry_fee: number;
  bracket_engine?: Record<string, unknown> | null;
  /** Other bracket sets in this squad's bowler-rollover cluster. */
  rollover_cluster_side_action_ids?: number[];
  /** Event-wide numbering: display = local bracket id + 1 + this offset. */
  bracket_number_offset?: number;
}

// Base side action interface
export interface SideAction {
  id: number;
  tournament_id: number;
  event_id: number;
  template_id?: number;
  name: string;
  description?: string;
  side_action_type: SideActionType;
  max_participants: number;
  entry_fee: number;
  house_cut_percentage: number;
  house_cut_amount?: number | null;
  house_cut_type: 'percentage' | 'dollars_per_entry' | 'amount';
  prize_distribution?: Record<string, number>;
  prize_type: 'percentage' | 'amount' | 'dollars_per_entry';
  custom_payout_structure?: string | null;
  status: SideActionStatus;
  is_active: boolean;
  check_in_required: boolean;
  check_in_start_time?: string;
  check_in_end_time?: string;
  start_time?: string;
  end_time?: string;
  game_numbers: number[];
  squad_scope_mode: SideActionSquadScopeMode;
  pools: SideActionPool[];
  type_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  /** Total entry tickets sold / signed up */
  current_entries?: number;
  /** Brackets generated, or 1 for non-bracket types */
  total_created?: number;
  entries_locked?: boolean;
  status_label?: string;
  /** Eliminator list row: bowlers still in the field (or entry count before scoring). */
  eliminator_currently_alive?: number;
  eliminator_is_complete?: boolean;
  eliminator_cash_spots?: number;
}

// Type-specific configurations

// Bracket configuration
export interface BracketConfig {
  game_numbers?: number[];
  /** Stage order for the selected games: forward 1→2→3, reverse 3→2→1. */
  game_order?: 'forward' | 'reverse';
  participant_count: number;
  bye_handling: 'none' | 'fill_one_bracket' | 'create_specific';
  specific_brackets?: number;
  tiebreaker_method: 'both_advance' | 'high_handicap' | 'high_scratch' | 'split_prize';
  /** When true, final-round ties split 1st/2nd prize (always on for bracket pots). */
  final_tie_splits_prize?: boolean;
  round_count?: number;
  /** Scratch = no handicap applied; handicap = pins added per bracket rules. */
  handicap_mode?: 'scratch' | 'handicap';
  /** When handicap: use event settings or manual base/percentage. */
  handicap_source?: 'event_default' | 'manual';
  handicap_base_score?: number;
  handicap_percentage?: number;
  /** Place prizes for (slots-1) seated pots; omit → use prize_distribution. */
  bye_prize_distribution?: Record<string, number>;
  /** Bowler = individual brackets; team = one ticket / member-sum score per event team. */
  entry_unit?: 'bowler' | 'team';
  divisions?: { men?: boolean; women?: boolean };
  age_classes?: { youth?: boolean; open?: boolean; senior?: boolean };
  youth_max_age?: number;
  senior_min_age?: number;
}

// High game configuration
export interface HighGameConfig {
  handicap_mode?: 'scratch' | 'handicap';
  handicap_source?: 'event_default' | 'manual';
  handicap_base_score?: number;
  handicap_percentage?: number;
  game_numbers?: number[];
  payout_mode?: 'per_game' | 'combined';
  divisions?: { men?: boolean; women?: boolean };
  age_classes?: { youth?: boolean; open?: boolean; senior?: boolean };
  youth_max_age?: number;
  senior_min_age?: number;
  /** Bowler = individual scores; team = member-sum of rostered individuals. */
  entry_unit?: 'bowler' | 'team';
}

export type HighSetSeriesMode = 'sum' | 'best_n';

// High Series (HIGH_SET) configuration
export interface HighSetConfig {
  handicap_mode?: 'scratch' | 'handicap';
  handicap_source?: 'event_default' | 'manual';
  handicap_base_score?: number;
  handicap_percentage?: number;
  game_numbers?: number[];
  series_mode?: HighSetSeriesMode;
  best_n?: number;
  divisions?: { men?: boolean; women?: boolean } | string[];
  age_classes?: { youth?: boolean; open?: boolean; senior?: boolean };
  youth_max_age?: number;
  senior_min_age?: number;
  /** Bowler = individual series; team = member-sum of rostered individuals per game, then series. */
  entry_unit?: 'bowler' | 'team';
}

// Eliminator configuration
export interface EliminatorConfig {
  /** Ordered ascending stage sequence; the last game is the payout game. */
  game_numbers?: number[];
  drop_mode?: 'percentage' | 'flat';
  /** Percent of original entries (0–100) or flat count, depending on drop_mode. */
  drop_amount?: number;
  /** uniform = one amount every cut; varied = per cut-game amounts. */
  drop_schedule?: 'uniform' | 'varied';
  /** Cut-game → drop amount when drop_schedule is varied (keys are game numbers). */
  drop_amounts_by_game?: Record<string, number>;
  /** Used when drop_mode is percentage (of entered bowlers, each cut). */
  round_mode?: 'up' | 'down';
  handicap_mode?: 'scratch' | 'handicap';
  handicap_source?: 'event_default' | 'manual';
  handicap_base_score?: number;
  handicap_percentage?: number;
  /** Bowler = individual scores; team = member-sum of rostered individuals. */
  entry_unit?: 'bowler' | 'team';
  divisions?: { men?: boolean; women?: boolean };
  age_classes?: { youth?: boolean; open?: boolean; senior?: boolean };
  youth_max_age?: number;
  senior_min_age?: number;
}

/** Mystery Doubles — single-game random pairs pot. */
export interface MysteryDoublesConfig {
  handicap_mode?: 'scratch' | 'handicap';
  handicap_source?: 'event_default' | 'manual';
  handicap_base_score?: number;
  handicap_percentage?: number;
  /** Exactly one game. */
  game_numbers?: number[];
  odd_entrant_policy?: 'block_until_even' | 'refund_random';
  pair_score_mode?: 'sum';
  divisions?: { men?: boolean; women?: boolean };
  age_classes?: { youth?: boolean; open?: boolean; senior?: boolean };
  youth_max_age?: number;
  senior_min_age?: number;
}

/** Mystery Game — spin a target score; pay exact match (or closest / respin). */
export interface MysteryGameConfig {
  handicap_mode?: 'scratch' | 'handicap';
  handicap_source?: 'event_default' | 'manual';
  handicap_base_score?: number;
  handicap_percentage?: number;
  game_numbers?: number[];
  /** single = one game; all_games_pool = every selected game score competes. */
  game_scope?: 'single' | 'all_games_pool';
  min_mystery_score?: number;
  max_mystery_score?: number;
  no_match_policy?: 'closest' | 'respin';
  divisions?: { men?: boolean; women?: boolean };
  age_classes?: { youth?: boolean; open?: boolean; senior?: boolean };
  youth_max_age?: number;
  senior_min_age?: number;
  entry_unit?: 'bowler' | 'team';
  spin?: Record<string, unknown>;
}

/** Love Doubles — every entered male paired with every entered female. */
export interface LoveDoublesConfig {
  handicap_mode?: 'scratch' | 'handicap';
  handicap_source?: 'event_default' | 'manual';
  handicap_base_score?: number;
  handicap_percentage?: number;
  game_numbers?: number[];
  pair_score_mode?: 'sum';
  divisions?: { men?: boolean; women?: boolean };
  age_classes?: { youth?: boolean; open?: boolean; senior?: boolean };
  youth_max_age?: number;
  senior_min_age?: number;
  entry_unit?: 'bowler';
}

/** Alibi Doubles — chosen-partner pair tickets. */
export interface AlibiDoublesConfig {
  handicap_mode?: 'scratch' | 'handicap';
  handicap_source?: 'event_default' | 'manual';
  handicap_base_score?: number;
  handicap_percentage?: number;
  game_numbers?: number[];
  pair_score_mode?: 'sum';
  max_pairs_per_bowler?: number | null;
  allow_cross_squad?: boolean;
  pair_require_mixed_gender?: boolean;
  pair_require_over_under?: boolean;
  divisions?: { men?: boolean; women?: boolean };
  age_classes?: { youth?: boolean; open?: boolean; senior?: boolean };
  youth_max_age?: number;
  senior_min_age?: number;
  entry_unit?: 'bowler';
}

export interface MysteryDoublesFundSnapshot {
  pool_id?: number | null;
  squad_id?: number | null;
  entry_count: number;
  pair_count?: number;
  refunded_count?: number;
  entry_fee: number;
  collected: number;
  expenses: number;
  prize_fund: number;
  places_sum: number;
  places_sum_all_games: number;
  payout_ready: boolean;
  overcommitted: boolean;
  pairs_drawn?: boolean;
}

export interface MysteryDoublesStandingRow {
  user_id_a: number;
  user_id_b: number;
  display_name: string;
  score: number;
  score_a: number;
  score_b: number;
  place?: number | null;
  payout: number;
  provisional_payout: number;
  is_complete: boolean;
  division?: string | null;
}

export interface MysteryDoublesStandingsPool {
  pool_id: number;
  squad_id?: number | null;
  squad_name?: string | null;
  division: string;
  game_number?: number | null;
  label: string;
  entry_count: number;
  pair_count?: number;
  refunded_user_ids?: number[];
  is_complete: boolean;
  pairs_drawn: boolean;
  fund?: MysteryDoublesFundSnapshot | Record<string, unknown>;
  rows: MysteryDoublesStandingRow[];
}

/** Live standings payload from GET mystery-doubles standings. */
export interface MysteryDoublesStandings {
  report_type: string;
  side_action_id: number;
  side_action_name: string;
  event_id?: number | null;
  money_visible?: boolean;
  handicap_mode: 'scratch' | 'handicap';
  game_numbers: number[];
  game_number: number;
  odd_entrant_policy?: string | null;
  pairs_drawn: boolean;
  pairing?: Record<string, unknown> | null;
  entrant_warning?: string | null;
  fund: MysteryDoublesFundSnapshot;
  pool_funds: MysteryDoublesFundSnapshot[];
  pools: MysteryDoublesStandingsPool[];
}

export interface MysteryDoublesDrawPairsResult {
  side_action_id: number;
  pairing: Record<string, unknown>;
  warnings: string[];
  odd_entrant_policy: string;
  game_numbers: number[];
}

export interface MysteryGameStandingRow {
  user_id: number;
  display_name: string;
  squad_id?: number | null;
  game_number?: number | null;
  score: number;
  place?: number | null;
  payout: number;
  provisional_payout: number;
  is_complete: boolean;
  is_winner?: boolean;
  distance?: number | null;
}

export interface MysteryGameStandingsPool {
  pool_id: number;
  squad_id?: number | null;
  squad_name?: string | null;
  division: string;
  game_number?: number | null;
  label: string;
  entry_count: number;
  candidates_count?: number;
  is_complete: boolean;
  missing_score_count?: number;
  spun: boolean;
  target_score?: number | null;
  outcome?: string | null;
  distance?: number | null;
  no_match_policy?: string | null;
  fund?: Record<string, unknown>;
  rows: MysteryGameStandingRow[];
  winners?: Array<Record<string, unknown>>;
}

export interface MysteryGameStandings {
  report_type: string;
  side_action_id: number;
  side_action_name: string;
  event_id?: number | null;
  money_visible?: boolean;
  handicap_mode: 'scratch' | 'handicap';
  game_numbers: number[];
  game_scope: 'single' | 'all_games_pool';
  min_mystery_score: number;
  max_mystery_score: number;
  no_match_policy?: string | null;
  entry_unit?: 'bowler' | 'team';
  spun: boolean;
  needs_respin: boolean;
  spin?: Record<string, unknown> | null;
  fund: Record<string, unknown>;
  pool_funds: Array<Record<string, unknown>>;
  pools: MysteryGameStandingsPool[];
}

export interface LoveDoublesFundSnapshot {
  pool_id?: number | null;
  squad_id?: number | null;
  entry_count: number;
  pair_count?: number;
  male_count?: number;
  female_count?: number;
  refunded_count?: number;
  entry_fee: number;
  collected: number;
  expenses: number;
  prize_fund: number;
  places_sum: number;
  places_sum_all_games: number;
  payout_ready: boolean;
  overcommitted: boolean;
  pairs_drawn?: boolean;
}

export interface LoveDoublesStandings {
  report_type: string;
  side_action_id: number;
  side_action_name: string;
  event_id?: number | null;
  money_visible?: boolean;
  handicap_mode: 'scratch' | 'handicap';
  game_numbers: number[];
  game_number?: number | null;
  games_label?: string;
  pairs_drawn: boolean;
  entrant_warning?: string | null;
  male_count?: number;
  female_count?: number;
  fund: LoveDoublesFundSnapshot;
  pool_funds: LoveDoublesFundSnapshot[];
  pools: MysteryDoublesStandingsPool[];
}

// Create side action request
export interface CreateSideActionRequest {
  name: string;
  tournament_id: number;
  event_id: number;
  side_action_type: SideActionType;
  description?: string;
  entry_fee: number;
  max_participants?: number;
  house_cut_percentage: number;
  house_cut_amount?: number | null;
  house_cut_type: 'percentage' | 'dollars_per_entry' | 'amount';
  game_numbers: number[];
  squad_scope_mode: SideActionSquadScopeMode;
  selected_squad_ids: number[];
  pool_overrides: Record<number, SideActionPoolOverride>;
  check_in_required?: boolean;
  type_config: Record<string, unknown>;
  prize_distribution?: Record<string, number>;
  prize_type: 'percentage' | 'amount' | 'dollars_per_entry';
  custom_payout_structure?: string | null;
}

// Update side action request
export interface UpdateSideActionRequest {
  name?: string;
  description?: string;
  entry_fee?: number;
  max_participants?: number;
  house_cut_percentage?: number;
  house_cut_amount?: number | null;
  house_cut_type?: 'percentage' | 'dollars_per_entry' | 'amount';
  game_numbers?: number[];
  squad_scope_mode?: SideActionSquadScopeMode;
  selected_squad_ids?: number[];
  pool_overrides?: Record<number, SideActionPoolOverride>;
  check_in_required?: boolean;
  check_in_start_time?: string;
  check_in_end_time?: string;
  start_time?: string;
  end_time?: string;
  status?: SideActionStatus;
  is_active?: boolean;
  type_config?: Record<string, unknown>;
  prize_distribution?: Record<string, number>;
  prize_type?: 'percentage' | 'amount' | 'dollars_per_entry';
  custom_payout_structure?: string | null;
}

export interface AlibiDoublesFundSnapshot {
  pool_id?: number | null;
  squad_id?: number | null;
  entry_count: number;
  pair_count?: number;
  refunded_count?: number;
  entry_fee: number;
  collected: number;
  expenses: number;
  prize_fund: number;
  places_sum: number;
  places_sum_all_games: number;
  payout_ready: boolean;
  overcommitted: boolean;
  pairs_drawn?: boolean;
}

export interface AlibiDoublesStandings {
  report_type: string;
  side_action_id: number;
  side_action_name: string;
  event_id?: number | null;
  money_visible?: boolean;
  handicap_mode: 'scratch' | 'handicap';
  game_numbers: number[];
  game_number?: number | null;
  games_label?: string;
  pairs_drawn: boolean;
  fund: AlibiDoublesFundSnapshot;
  pool_funds: AlibiDoublesFundSnapshot[];
  pools: MysteryDoublesStandingsPool[];
}

export interface AlibiDoublesPairRow {
  entry_id: number;
  pool_id: number;
  squad_id: number;
  squad_name?: string | null;
  holder_user_id: number;
  holder_name: string;
  partner_user_id: number;
  partner_name: string;
  entry_fee_paid: boolean;
}

export interface AlibiDoublesPairList {
  side_action_id: number;
  side_action_name: string;
  allow_cross_squad: boolean;
  max_pairs_per_bowler?: number | null;
  pair_require_mixed_gender: boolean;
  pair_require_over_under: boolean;
  pairs: AlibiDoublesPairRow[];
}

export interface AlibiDoublesEligiblePartner {
  user_id: number;
  display_name: string;
  squad_id?: number | null;
  squad_name?: string | null;
  already_paired: boolean;
  at_limit: boolean;
  scoring_started?: boolean;
  eligible: boolean;
}

export interface AlibiDoublesEligiblePartners {
  side_action_id: number;
  holder_user_id: number;
  pool_id: number;
  signup_frozen: boolean;
  holder_at_limit?: boolean;
  partners: AlibiDoublesEligiblePartner[];
}
