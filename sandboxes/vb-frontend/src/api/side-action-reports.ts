import axiosInstance from '../api/axios';
import type { Bracket } from '../utils/bracketEngine/types';

export interface SignupSheetReport {
  report_type: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  mode: 'roster' | 'blank';
  blank_pages?: number | null;
  blank_rows?: number | null;
  rows_per_page?: number | null;
  side_actions: Array<{
    side_action_id: number;
    name: string;
    side_action_type: string;
    entry_fee: number;
    pool_id: number;
    squad_id: number;
    squad_name: string;
  }>;
  rows: Array<{
    user_id?: number | null;
    display_name: string;
    counts: Record<string, number | null | undefined>;
    total?: number | null;
  }>;
}

export interface EntrySummaryPotScenario {
  label: string;
  entries: number;
  entry_fee: number;
  collected: number;
  fees: number;
  first: number;
  second: number;
  third?: number;
  fourth?: number;
  winnings: number;
}

export interface EntrySummaryBracketSetup {
  side_action_id: number;
  side_action_name: string;
  pool_id?: number;
  squad_id?: number;
  squad_name?: string;
  game_numbers?: number[];
  entry_fee: number;
  slots_full: number;
  total_entries?: number;
  bracket_count?: number;
  unplaced_tickets?: number;
  payouts: { first: number; second: number; third?: number; fourth?: number; fee?: number };
  bye_payouts?: { first: number; second: number; third?: number; fourth?: number; fee?: number };
  scenarios: EntrySummaryPotScenario[];
}

export interface EntrySummaryReport {
  report_type: string;
  side_action_id?: number | null;
  side_action_name: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  scope: 'this' | 'all';
  pool_id?: number | null;
  squad_id?: number | null;
  squad_name?: string | null;
  source: 'generated' | 'preview' | 'mixed';
  entry_fee?: number | null;
  payouts?: { first: number; second: number; third?: number; fourth?: number; fee?: number } | null;
  total_entries: number;
  bracket_count: number;
  unplaced_tickets: number;
  financials: {
    total_collected: number;
    total_refunds: number;
    winnings: number;
    total_payout: number;
    fees: number;
  };
  included_side_actions?: string[];
  bracket_setups?: EntrySummaryBracketSetup[];
}

export type EventEntrySummarySectionType =
  | 'bracket'
  | 'high_game'
  | 'high_set'
  | 'eliminator'
  | 'mystery_doubles'
  | 'mystery_game'
  | 'love_doubles'
  | 'alibi_doubles';

export interface EventEntrySummarySection {
  section_type: EventEntrySummarySectionType;
  label: string;
  report: Record<string, unknown>;
}

export interface EventEntrySummaryReport {
  report_type: 'event_entry_summary';
  side_action_id: number;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  sections: EventEntrySummarySection[];
}

export type AliveListDisplayMode = 'bracket_numbers' | 'opponent_names' | 'total_only';

export interface AliveListOpponent {
  user_id: number;
  display_name: string;
  count: number;
}

export interface AliveListRow {
  user_id: number;
  display_name: string;
  alive_count: number;
  bracket_numbers: number[];
  opponents: AliveListOpponent[];
  first_count: number;
  second_count: number;
  third_count?: number;
  fourth_count?: number;
  split_count: number;
}

export interface AliveListReport {
  report_type: string;
  scope?: 'this' | 'all';
  side_action_id?: number | null;
  side_action_name: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  pool_id?: number | null;
  squad_id?: number | null;
  squad_name?: string | null;
  display_mode: AliveListDisplayMode;
  as_of_game?: number | null;
  as_of_label: string;
  last_synced_game?: number | null;
  available_games: number[];
  game_window: number[];
  complete: boolean;
  bracket_count: number;
  alive_bowler_count: number;
  alive_ticket_count: number;
  rows: AliveListRow[];
  entry_unit?: 'bowler' | 'team';
  included_side_actions?: string[];
}

export interface BracketsReport {
  report_type: string;
  side_action_id: number;
  side_action_name: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  pool_id: number;
  squad_id: number;
  squad_name: string;
  game_numbers: number[];
  bracket_count: number;
  bracket_number_offset?: number;
  pot_from?: number | null;
  pot_to?: number | null;
  brackets: Bracket[];
  user_display_names: Record<number, string>;
  entry_unit?: 'bowler' | 'team';
  payouts: { first: number; second: number; third?: number; fourth?: number };
  bye_payouts: { first: number; second: number; third?: number; fourth?: number };
  last_synced_game?: number | null;
}

export interface HighGameEntrySummaryPot {
  side_action_id: number;
  side_action_name: string;
  pool_id: number;
  squad_id: number;
  squad_name: string;
  entry_fee: number;
  entry_count: number;
  handicap_mode: string;
  payout_mode: string;
  game_numbers: number[];
  divisions: { men: boolean; women: boolean };
  expense_type: 'per_entry' | 'flat';
  expense_amount: number;
  place_amounts: number[];
  fund: {
    collected: number;
    expenses: number;
    prize_fund: number;
    places_sum: number;
    places_sum_all_games: number;
    payout_ready?: boolean;
    overcommitted?: boolean;
  };
}

export interface HighGameEntrySummaryReport {
  report_type: string;
  side_action_id?: number | null;
  side_action_name: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  scope: 'this' | 'all';
  included_side_actions?: string[];
  pots: HighGameEntrySummaryPot[];
  totals: {
    entry_count: number;
    collected: number;
    expenses: number;
    prize_fund: number;
    places_sum_all_games: number;
  };
}

export type HighGameReportListMode = 'winners' | 'all';
export type HighSetReportListMode = 'winners' | 'all';
export type MysteryDoublesReportListMode = 'winners' | 'all';
export type LoveDoublesReportListMode = 'winners' | 'all';
export type EliminatorReportDisplayMode = 'columns' | 'pages';

export interface MysteryGameEntrySummaryPot {
  side_action_id: number;
  side_action_name: string;
  pool_id: number;
  squad_id: number;
  squad_name: string;
  entry_fee: number;
  entry_count: number;
  entry_unit: 'bowler' | 'team';
  handicap_mode: string;
  game_scope: 'single' | 'all_games_pool';
  game_numbers: number[];
  min_mystery_score: number;
  max_mystery_score: number;
  no_match_policy: string;
  divisions: { men?: boolean; women?: boolean };
  place_amounts: number[];
  spun: boolean;
  mystery_number?: number | null;
  outcome?: string | null;
  needs_respin: boolean;
  fund: {
    collected: number;
    expenses: number;
    prize_fund: number;
    payout_ready?: boolean;
    overcommitted?: boolean;
  };
}

export interface MysteryGameEntrySummaryReport {
  report_type: string;
  tournament_name: string;
  director_name?: string | null;
  event_name: string;
  scope?: 'this' | 'all';
  pots: MysteryGameEntrySummaryPot[];
}

export interface MysteryGameReport {
  report_type: string;
  side_action_id: number;
  side_action_name: string;
  tournament_name: string;
  director_name?: string | null;
  event_name: string;
  handicap_mode: string;
  game_scope: 'single' | 'all_games_pool';
  game_numbers: number[];
  entry_unit: 'bowler' | 'team';
  min_mystery_score: number;
  max_mystery_score: number;
  no_match_policy: string;
  spun: boolean;
  needs_respin: boolean;
  sections: Array<{
    label: string;
    pool_id: number;
    squad_name?: string | null;
    mystery_number?: number | null;
    outcome?: string | null;
    distance?: number | null;
    no_match_policy?: string | null;
    spun: boolean;
    winners: Array<{
      display_name: string;
      score: number;
      game_number?: number | null;
      distance?: number | null;
      payout: number;
      place?: number | null;
    }>;
    misses: Array<{
      display_name: string;
      score: number;
      game_number?: number | null;
      distance?: number | null;
      payout: number;
      place?: number | null;
    }>;
  }>;
  fund: Record<string, unknown>;
}

export interface MysteryDoublesEntrySummaryPot {
  side_action_id: number;
  side_action_name: string;
  pool_id: number;
  squad_id: number;
  squad_name: string;
  entry_fee: number;
  entry_count: number;
  pair_count: number;
  refunded_count: number;
  handicap_mode: string;
  game_number: number;
  odd_entrant_policy: string;
  pairs_drawn: boolean;
  divisions: { men?: boolean; women?: boolean };
  place_amounts: number[];
  fund: {
    entry_count?: number;
    pair_count?: number;
    refunded_count?: number;
    collected: number;
    expenses: number;
    prize_fund: number;
    places_sum?: number;
    payout_ready?: boolean;
    overcommitted?: boolean;
    pairs_drawn?: boolean;
  };
  entrant_warning?: string | null;
}

export interface MysteryDoublesEntrySummaryReport {
  report_type: string;
  tournament_name: string;
  director_name?: string | null;
  event_name: string;
  pots: MysteryDoublesEntrySummaryPot[];
}

export interface MysteryDoublesReport {
  report_type: string;
  side_action_id: number;
  side_action_name: string;
  tournament_name: string;
  director_name?: string | null;
  event_name: string;
  handicap_mode: string;
  game_number: number;
  pairs_drawn: boolean;
  entrant_warning?: string | null;
  list_mode: MysteryDoublesReportListMode;
  sections: Array<{
    label: string;
    pool_id: number;
    squad_name?: string | null;
    division: string;
    game_number: number;
    rows: Array<{
      place?: number | null;
      display_name: string;
      score: number;
      score_a: number;
      score_b: number;
      payout: number;
      member_a?: string | null;
      member_b?: string | null;
    }>;
  }>;
  fund: Record<string, unknown>;
}

export interface LoveDoublesEntrySummaryPot {
  side_action_id: number;
  side_action_name: string;
  pool_id: number;
  squad_id: number;
  squad_name: string;
  entry_fee: number;
  entry_count: number;
  pair_count: number;
  male_count: number;
  female_count: number;
  refunded_count: number;
  handicap_mode: string;
  game_numbers?: number[];
  game_number?: number | null;
  games_label?: string;
  pairs_drawn: boolean;
  divisions: { men?: boolean; women?: boolean };
  place_amounts: number[];
  fund: {
    entry_count?: number;
    pair_count?: number;
    collected: number;
    expenses: number;
    prize_fund: number;
    places_sum?: number;
    payout_ready?: boolean;
    overcommitted?: boolean;
    pairs_drawn?: boolean;
  };
  entrant_warning?: string | null;
}

export interface LoveDoublesEntrySummaryReport {
  report_type: string;
  tournament_name: string;
  director_name?: string | null;
  event_name: string;
  pots: LoveDoublesEntrySummaryPot[];
}

export interface LoveDoublesReport {
  report_type: string;
  side_action_id: number;
  side_action_name: string;
  tournament_name: string;
  director_name?: string | null;
  event_name: string;
  handicap_mode: string;
  game_numbers?: number[];
  game_number?: number | null;
  games_label?: string;
  pairs_drawn: boolean;
  entrant_warning?: string | null;
  list_mode: LoveDoublesReportListMode;
  sections: Array<{
    label: string;
    pool_id: number;
    squad_name?: string | null;
    division: string;
    game_number?: number | null;
    rows: Array<{
      place?: number | null;
      display_name: string;
      score: number;
      score_a: number;
      score_b: number;
      payout: number;
      member_a?: string | null;
      member_b?: string | null;
    }>;
  }>;
  fund: Record<string, unknown>;
}

export type AlibiDoublesReportListMode = LoveDoublesReportListMode;
export type AlibiDoublesReport = LoveDoublesReport;
export type AlibiDoublesEntrySummaryReport = Omit<
  LoveDoublesEntrySummaryReport,
  'pots'
> & {
  pots: Array<
    Omit<LoveDoublesEntrySummaryPot, 'male_count' | 'female_count'> & {
      male_count?: number;
      female_count?: number;
    }
  >;
};

export interface EliminatorEntrySummaryPot {
  side_action_id: number;
  side_action_name: string;
  pool_id: number;
  squad_id: number;
  squad_name: string;
  entry_fee: number;
  entry_count: number;
  handicap_mode: string;
  game_numbers: number[];
  drop_mode: 'percentage' | 'flat';
  drop_amount: number;
  drop_schedule?: 'uniform' | 'varied';
  drop_amounts_by_game?: Record<string, number>;
  round_mode?: 'up' | 'down' | null;
  final_alive: number;
  expense_type: 'per_entry' | 'flat';
  expense_amount: number;
  place_amounts: number[];
  cut_steps: Array<{
    game_number: number;
    role: string;
    starting_alive: number;
    dropped: number;
    surviving: number;
  }>;
  fund: {
    collected: number;
    expenses: number;
    prize_fund: number;
    places_sum: number;
    payout_ready?: boolean;
    overcommitted?: boolean;
  };
}

export interface EliminatorEntrySummaryReport {
  report_type: string;
  side_action_id?: number | null;
  side_action_name: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  scope: 'this' | 'all';
  included_side_actions?: string[];
  pots: EliminatorEntrySummaryPot[];
  totals: {
    entry_count: number;
    collected: number;
    expenses: number;
    prize_fund: number;
    places_sum: number;
  };
}

export interface EliminatorReport {
  report_type: string;
  side_action_id: number;
  side_action_name: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  handicap_mode: string;
  game_numbers: number[];
  entry_unit?: 'bowler' | 'team';
  drop_mode: 'percentage' | 'flat';
  drop_amount: number;
  drop_schedule?: 'uniform' | 'varied';
  drop_amounts_by_game?: Record<string, number>;
  round_mode?: 'up' | 'down' | null;
  display_mode: EliminatorReportDisplayMode;
  columns_available: boolean;
  max_columns_games: number;
  cut_summary: Array<{
    game_number: number;
    role: string;
    starting_alive: number;
    dropped: number;
    surviving: number;
  }>;
  final_alive: number;
  payout_game: number;
  fund: {
    entry_count: number;
    entry_fee: number;
    collected: number;
    expenses: number;
    prize_fund: number;
    places_sum: number;
    payout_ready: boolean;
    overcommitted: boolean;
  };
  games: Array<{
    game_number: number;
    role: 'cut' | 'payout';
    label: string;
    starting_alive: number;
    dropped: number;
    surviving: number;
    advance_count: number;
    cut_drop: number;
    rows: Array<{
      user_id: number;
      display_name: string;
      score?: number | null;
      rank?: number | null;
      status: string;
      advanced: boolean;
      place?: number | null;
      payout: number;
    }>;
  }>;
  column_rows: Array<{
    user_id: number;
    display_name: string;
    scores: Record<string, number>;
    eliminated_after_game?: number | null;
    place?: number | null;
    payout: number;
    furthest_game: number;
  }>;
  sections: Array<{
    pool_id: number;
    squad_id: number;
    squad_name: string;
    game_numbers: number[];
    scoring_mode: string;
    entry_count: number;
    fund: {
      entry_count: number;
      entry_fee: number;
      collected: number;
      expenses: number;
      prize_fund: number;
      places_sum: number;
      payout_ready: boolean;
      overcommitted: boolean;
    };
    is_complete: boolean;
    payout_ready: boolean;
    games: EliminatorReport['games'];
    column_rows: EliminatorReport['column_rows'];
  }>;
  warning?: string | null;
}

export interface HighSetEntrySummaryPot {
  side_action_id: number;
  side_action_name: string;
  pool_id: number;
  squad_id: number;
  squad_name: string;
  entry_fee: number;
  entry_count: number;
  handicap_mode: string;
  series_mode: 'sum' | 'best_n';
  best_n?: number | null;
  game_numbers: number[];
  divisions: { men: boolean; women: boolean };
  expense_type: 'per_entry' | 'flat' | 'percentage';
  expense_amount: number;
  place_amounts: number[];
  fund: {
    collected: number;
    expenses: number;
    prize_fund: number;
    places_sum: number;
    places_sum_all_games: number;
  };
}

export interface HighSetEntrySummaryReport {
  report_type: string;
  side_action_id?: number | null;
  side_action_name: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  scope: 'this' | 'all';
  included_side_actions?: string[];
  pots: HighSetEntrySummaryPot[];
  totals: {
    entry_count: number;
    collected: number;
    expenses: number;
    prize_fund: number;
    places_sum_all_games: number;
  };
}

export interface HighSetReport {
  report_type: string;
  side_action_id: number;
  side_action_name: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  handicap_mode: string;
  series_mode: 'sum' | 'best_n';
  best_n?: number | null;
  game_numbers: number[];
  list_mode: HighSetReportListMode;
  entry_unit?: 'bowler' | 'team';
  fund: {
    entry_count: number;
    entry_fee: number;
    collected: number;
    expenses: number;
    prize_fund: number;
    places_sum: number;
    places_sum_all_games: number;
  };
  sections: Array<{
    label: string;
    pool_id: number;
    squad_id?: number | null;
    squad_name?: string | null;
    division: string;
    entry_count: number;
    game_numbers: number[];
    scoring_mode: string;
    fund: Record<string, number | boolean | null>;
    is_complete: boolean;
    payout_ready: boolean;
    rows: Array<{
      user_id: number;
      display_name: string;
      score: number;
      game_scores?: Record<string, number | null>;
      place?: number | null;
      payout: number;
    }>;
  }>;
}

export interface HighGameReport {
  report_type: string;
  side_action_id: number;
  side_action_name: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  payout_mode: string;
  handicap_mode: string;
  available_games: number[];
  selected_games: number[];
  list_mode: HighGameReportListMode;
  entry_unit?: 'bowler' | 'team';
  fund: {
    entry_count?: number;
    entry_fee?: number;
    collected?: number;
    expenses?: number;
    prize_fund?: number;
    places_sum?: number;
    places_sum_all_games?: number;
  };
  sections: Array<{
    label: string;
    pool_id: number;
    squad_id?: number | null;
    squad_name?: string | null;
    division: string;
    game_number?: number | null;
    entry_count: number;
    game_numbers?: number[];
    scoring_mode?: string;
    fund?: Record<string, number | boolean | null>;
    is_complete?: boolean;
    payout_ready?: boolean;
    rows: Array<{
      user_id: number;
      display_name: string;
      game_number?: number | null;
      score: number;
      place?: number | null;
      payout: number;
    }>;
  }>;
}

export interface PayoutReport {
  report_type: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  group_by?: 'bowler' | 'team';
  team_header_payouts?: boolean;
  side_actions: Array<{
    side_action_id: number;
    name: string;
    side_action_type: string;
    entry_fee: number;
    entry_unit?: 'bowler' | 'team';
    payout_ready?: boolean;
    payout_not_ready_reason?: string | null;
  }>;
  rows: Array<{
    user_id: number;
    display_name: string;
    team_id?: number | null;
    team_name?: string | null;
    row_kind?: 'bowler' | 'team';
    is_header?: boolean;
    nested?: boolean;
    payouts: Record<string, number | string>;
    total_entered: number;
    total_collected: number;
    total_owed: number;
  }>;
}

export type IndividualBracketGameResult =
  | 'self'
  | 'opponent'
  | 'tie'
  | 'unresolved'
  | 'not_reached';

export interface IndividualBracketGameSlot {
  reached: boolean;
  opponent_user_id?: number | null;
  opponent_name: string;
  opponent_score: string;
  own_score: string;
  result: IndividualBracketGameResult;
}

export interface IndividualBracketReport {
  report_type: string;
  scope: 'this' | 'all';
  side_action_id?: number | null;
  side_action_name: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  user_id: number;
  display_name: string;
  entry_fee?: number | null;
  payouts: { first: number; second: number; third?: number; fourth?: number };
  bye_payouts: { first: number; second: number; third?: number; fourth?: number };
  sections: Array<{
    side_action_id: number;
    side_action_name: string;
    pool_id: number;
    squad_id: number;
    squad_name: string;
    game_numbers?: number[];
    entry_fee: number;
    rows: Array<{
      bracket_number: number;
      g1: IndividualBracketGameSlot;
      g2: IndividualBracketGameSlot;
      final: IndividualBracketGameSlot;
      prize: number;
    }>;
  }>;
  rows: Array<{
    bracket_number: number;
    g1: IndividualBracketGameSlot;
    g2: IndividualBracketGameSlot;
    final: IndividualBracketGameSlot;
    prize: number;
  }>;
  summary: {
    brackets_entered: number;
    entry_count: number;
    lost_game_1: number;
    lost_game_2: number;
    first_place: number;
    second_place: number;
    third_place?: number;
    fourth_place?: number;
    splits: number;
    total_entered: number;
    total_winnings: number;
    unused_tickets: number;
    refund_amount: number;
    total_payout: number;
  };
  last_synced_game?: number | null;
}

const SIDE_ACTION_REPORT_ENDPOINTS = {
  SIGNUP_SHEET_REPORT: '/side-actions/reports/signup-sheet',
  ENTRY_SUMMARY_REPORT: '/side-actions/reports/entry-summary',
  EVENT_ENTRY_SUMMARY_REPORT: '/side-actions/reports/event-entry-summary',
  ALIVE_LIST_REPORT: '/side-actions/reports/alive-list',
  BRACKETS_REPORT: '/side-actions/reports/brackets',
  PAYOUT_REPORT: '/side-actions/reports/payout',
  INDIVIDUAL_BRACKET_REPORT: '/side-actions/reports/individual-bracket',
  HIGH_GAME_ENTRY_SUMMARY_REPORT: '/side-actions/reports/high-game-entry-summary',
  HIGH_GAME_REPORT: '/side-actions/reports/high-game',
  HIGH_SET_ENTRY_SUMMARY_REPORT: '/side-actions/reports/high-set-entry-summary',
  HIGH_SET_REPORT: '/side-actions/reports/high-set',
  ELIMINATOR_ENTRY_SUMMARY_REPORT: '/side-actions/reports/eliminator-entry-summary',
  ELIMINATOR_REPORT: '/side-actions/reports/eliminator',
  MYSTERY_DOUBLES_ENTRY_SUMMARY_REPORT:
    '/side-actions/reports/mystery-doubles-entry-summary',
  MYSTERY_DOUBLES_REPORT: '/side-actions/reports/mystery-doubles',
  MYSTERY_GAME_ENTRY_SUMMARY_REPORT:
    '/side-actions/reports/mystery-game-entry-summary',
  MYSTERY_GAME_REPORT: '/side-actions/reports/mystery-game',
  LOVE_DOUBLES_ENTRY_SUMMARY_REPORT:
    '/side-actions/reports/love-doubles-entry-summary',
  LOVE_DOUBLES_REPORT: '/side-actions/reports/love-doubles',
  ALIBI_DOUBLES_ENTRY_SUMMARY_REPORT:
    '/side-actions/reports/alibi-doubles-entry-summary',
  ALIBI_DOUBLES_REPORT: '/side-actions/reports/alibi-doubles',
};

type DoublesReportIds = {
  side_action_id: number;
  tournament_id: number;
  event_id: number;
  pool_id?: number;
};

function requireDoublesReportIds(
  options: DoublesReportIds,
  label: string
): { sideActionId: number; tournamentId: number; eventId: number } {
  const sideActionId = Number(options.side_action_id);
  const tournamentId = Number(options.tournament_id);
  const eventId = Number(options.event_id);
  if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
    throw new Error(`Side action id is required for ${label}.`);
  }
  if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
    throw new Error(`Tournament id is required for ${label}.`);
  }
  if (!Number.isFinite(eventId) || eventId <= 0) {
    throw new Error(`Event id is required for ${label}.`);
  }
  return { sideActionId, tournamentId, eventId };
}

async function postDoublesSideActionReport<T>(
  endpoint: string,
  label: string,
  options: DoublesReportIds & { scope?: 'this' | 'all'; list_mode?: string }
): Promise<T> {
  const { sideActionId, tournamentId, eventId } = requireDoublesReportIds(options, label);
  const body: Record<string, unknown> = {
    side_action_id: sideActionId,
    tournament_id: tournamentId,
    event_id: eventId,
  };
  if (options.scope != null) {
    body.scope = options.scope;
  }
  if (options.list_mode != null) {
    body.list_mode = options.list_mode;
  }
  if (options.pool_id != null) {
    body.pool_id = options.pool_id;
  }
  const response = await axiosInstance.post<T>(endpoint, body);
  return response.data;
}

export const SideActionReportsAPI = {
  getSignupSheetReport: async (options: {
    tournament_id: number;
    event_id: number;
    mode: 'roster' | 'blank';
    blank_pages?: number;
  }): Promise<SignupSheetReport> => {
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required to build the sign-up sheet.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required to build the sign-up sheet.');
    }
    const response = await axiosInstance.post<SignupSheetReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.SIGNUP_SHEET_REPORT,
      {
        tournament_id: tournamentId,
        event_id: eventId,
        mode: options.mode,
        blank_pages: options.blank_pages ?? 1,
      }
    );
    return response.data;
  },

  getEntrySummaryReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    scope?: 'this' | 'all';
    pool_id?: number;
  }): Promise<EntrySummaryReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required to build the entry summary.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required to build the entry summary.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required to build the entry summary.');
    }
    const response = await axiosInstance.post<EntrySummaryReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.ENTRY_SUMMARY_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        scope: options.scope ?? 'this',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getEventEntrySummaryReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
  }): Promise<EventEntrySummaryReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required to build the event entry summary.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required to build the event entry summary.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required to build the event entry summary.');
    }
    const response = await axiosInstance.post<EventEntrySummaryReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.EVENT_ENTRY_SUMMARY_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
      }
    );
    return response.data;
  },

  getAliveListReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    display_mode?: AliveListDisplayMode;
    as_of_game?: number | null;
    scope?: 'this' | 'all';
    pool_id?: number;
  }): Promise<AliveListReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required to build the alive list.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required to build the alive list.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required to build the alive list.');
    }
    const response = await axiosInstance.post<AliveListReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.ALIVE_LIST_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        display_mode: options.display_mode ?? 'bracket_numbers',
        as_of_game: options.as_of_game ?? null,
        scope: options.scope ?? 'this',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getBracketsReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    pool_id: number;
    pot_from?: number;
    pot_to?: number;
  }): Promise<BracketsReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required to build the brackets report.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required to build the brackets report.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required to build the brackets report.');
    }
    const response = await axiosInstance.post<BracketsReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.BRACKETS_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        pool_id: options.pool_id,
        pot_from: options.pot_from,
        pot_to: options.pot_to,
      }
    );
    return response.data;
  },

  getPayoutReport: async (options: {
    tournament_id: number;
    event_id: number;
    group_by?: 'bowler' | 'team';
    team_header_payouts?: boolean;
  }): Promise<PayoutReport> => {
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required to build the payout report.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required to build the payout report.');
    }
    const response = await axiosInstance.post<PayoutReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.PAYOUT_REPORT,
      {
        tournament_id: tournamentId,
        event_id: eventId,
        group_by: options.group_by === 'team' ? 'team' : 'bowler',
        team_header_payouts: options.team_header_payouts !== false,
      }
    );
    return response.data;
  },

  getHighGameEntrySummaryReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    scope?: 'this' | 'all';
    pool_id?: number;
  }): Promise<HighGameEntrySummaryReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required for High Game entry summary.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required for High Game entry summary.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required for High Game entry summary.');
    }
    const response = await axiosInstance.post<HighGameEntrySummaryReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.HIGH_GAME_ENTRY_SUMMARY_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        scope: options.scope ?? 'this',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getHighGameReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    game_numbers?: number[];
    list_mode?: HighGameReportListMode;
    pool_id?: number;
  }): Promise<HighGameReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required for the High Game report.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required for the High Game report.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required for the High Game report.');
    }
    const response = await axiosInstance.post<HighGameReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.HIGH_GAME_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        game_numbers: options.game_numbers,
        list_mode: options.list_mode ?? 'winners',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getHighSetEntrySummaryReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    scope?: 'this' | 'all';
    pool_id?: number;
  }): Promise<HighSetEntrySummaryReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required for High Series entry summary.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required for High Series entry summary.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required for High Series entry summary.');
    }
    const response = await axiosInstance.post<HighSetEntrySummaryReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.HIGH_SET_ENTRY_SUMMARY_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        scope: options.scope ?? 'this',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getHighSetReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    list_mode?: HighSetReportListMode;
    pool_id?: number;
  }): Promise<HighSetReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required for the High Series report.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required for the High Series report.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required for the High Series report.');
    }
    const response = await axiosInstance.post<HighSetReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.HIGH_SET_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        list_mode: options.list_mode ?? 'winners',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getEliminatorEntrySummaryReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    scope?: 'this' | 'all';
    pool_id?: number;
  }): Promise<EliminatorEntrySummaryReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required for Eliminator entry summary.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required for Eliminator entry summary.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required for Eliminator entry summary.');
    }
    const response = await axiosInstance.post<EliminatorEntrySummaryReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.ELIMINATOR_ENTRY_SUMMARY_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        scope: options.scope ?? 'this',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getEliminatorReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    display_mode?: EliminatorReportDisplayMode;
    pool_id?: number;
  }): Promise<EliminatorReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required for the Eliminator report.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required for the Eliminator report.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required for the Eliminator report.');
    }
    const response = await axiosInstance.post<EliminatorReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.ELIMINATOR_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        display_mode: options.display_mode ?? 'columns',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getMysteryDoublesEntrySummaryReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    scope?: 'this' | 'all';
    pool_id?: number;
  }): Promise<MysteryDoublesEntrySummaryReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required for Mystery Doubles entry summary.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required for Mystery Doubles entry summary.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required for Mystery Doubles entry summary.');
    }
    const response = await axiosInstance.post<MysteryDoublesEntrySummaryReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.MYSTERY_DOUBLES_ENTRY_SUMMARY_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        scope: options.scope ?? 'this',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getMysteryDoublesReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    list_mode?: MysteryDoublesReportListMode;
    pool_id?: number;
  }): Promise<MysteryDoublesReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required for the Mystery Doubles report.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required for the Mystery Doubles report.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required for the Mystery Doubles report.');
    }
    const response = await axiosInstance.post<MysteryDoublesReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.MYSTERY_DOUBLES_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        list_mode: options.list_mode ?? 'winners',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getMysteryGameEntrySummaryReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    scope?: 'this' | 'all';
    pool_id?: number;
  }): Promise<MysteryGameEntrySummaryReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required for Mystery Game entry summary.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required for Mystery Game entry summary.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required for Mystery Game entry summary.');
    }
    const response = await axiosInstance.post<MysteryGameEntrySummaryReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.MYSTERY_GAME_ENTRY_SUMMARY_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        scope: options.scope ?? 'this',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getMysteryGameReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    pool_id?: number;
  }): Promise<MysteryGameReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required for the Mystery Game report.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required for the Mystery Game report.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required for the Mystery Game report.');
    }
    const response = await axiosInstance.post<MysteryGameReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.MYSTERY_GAME_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },

  getLoveDoublesEntrySummaryReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    scope?: 'this' | 'all';
    pool_id?: number;
  }): Promise<LoveDoublesEntrySummaryReport> =>
    postDoublesSideActionReport(
      SIDE_ACTION_REPORT_ENDPOINTS.LOVE_DOUBLES_ENTRY_SUMMARY_REPORT,
      'Love Doubles entry summary',
      { ...options, scope: options.scope ?? 'this' }
    ),

  getLoveDoublesReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    list_mode?: LoveDoublesReportListMode;
    pool_id?: number;
  }): Promise<LoveDoublesReport> =>
    postDoublesSideActionReport(
      SIDE_ACTION_REPORT_ENDPOINTS.LOVE_DOUBLES_REPORT,
      'Love Doubles report',
      { ...options, list_mode: options.list_mode ?? 'winners' }
    ),

  getAlibiDoublesEntrySummaryReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    scope?: 'this' | 'all';
    pool_id?: number;
  }): Promise<AlibiDoublesEntrySummaryReport> =>
    postDoublesSideActionReport(
      SIDE_ACTION_REPORT_ENDPOINTS.ALIBI_DOUBLES_ENTRY_SUMMARY_REPORT,
      'Alibi Doubles entry summary',
      { ...options, scope: options.scope ?? 'this' }
    ),

  getAlibiDoublesReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    list_mode?: AlibiDoublesReportListMode;
    pool_id?: number;
  }): Promise<AlibiDoublesReport> =>
    postDoublesSideActionReport(
      SIDE_ACTION_REPORT_ENDPOINTS.ALIBI_DOUBLES_REPORT,
      'Alibi Doubles report',
      { ...options, list_mode: options.list_mode ?? 'winners' }
    ),

  getIndividualBracketReport: async (options: {
    side_action_id: number;
    tournament_id: number;
    event_id: number;
    user_id: number;
    scope?: 'this' | 'all';
    pool_id?: number;
  }): Promise<IndividualBracketReport> => {
    const sideActionId = Number(options.side_action_id);
    const tournamentId = Number(options.tournament_id);
    const eventId = Number(options.event_id);
    const userId = Number(options.user_id);
    if (!Number.isFinite(sideActionId) || sideActionId <= 0) {
      throw new Error('Side action id is required to build the individual bracket report.');
    }
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      throw new Error('Tournament id is required to build the individual bracket report.');
    }
    if (!Number.isFinite(eventId) || eventId <= 0) {
      throw new Error('Event id is required to build the individual bracket report.');
    }
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new Error('Bowler is required to build the individual bracket report.');
    }
    const response = await axiosInstance.post<IndividualBracketReport>(
      SIDE_ACTION_REPORT_ENDPOINTS.INDIVIDUAL_BRACKET_REPORT,
      {
        side_action_id: sideActionId,
        tournament_id: tournamentId,
        event_id: eventId,
        user_id: userId,
        scope: options.scope ?? 'this',
        pool_id: options.pool_id,
      }
    );
    return response.data;
  },
};
