import axios from 'axios';
import axiosInstance from './axios';

export type EventStandingsScope = 'tournament' | 'event' | 'squad';
export type EventStandingsBasis = 'final' | 'round';

export interface EventStandingsReportRequest {
  tournament_id: number;
  event_id?: number | null;
  squad_id?: number | null;
  scope: EventStandingsScope;
  basis: EventStandingsBasis;
  round_number?: number | null;
  include_prizes?: boolean;
  include_handicap?: boolean;
  /** Draw a cut/cash line after the last cashing or advancing place. */
  show_cut_line?: boolean;
}

export interface EventStandingsBowler {
  user_id?: number | null;
  event_participant_id?: number | null;
  display_name: string;
}

export interface EventStandingsGameScore {
  game_number: number;
  score_scratch: number;
  handicap_pins?: number;
  score_handicap: number;
  /** True when this game was a match win (RR); omit/false for losses/ties. */
  is_win?: boolean | null;
  dylg_dropped?: boolean | null;
  dylg_candidate?: boolean | null;
}

export interface EventStandingsMemberResults {
  display_name: string;
  games: EventStandingsGameScore[];
}

export interface EventStandingsRow {
  place: number;
  place_label?: string | null;
  score_scratch: number;
  /** Match-play / format bonus pins (separate from handicap). */
  bonus_pins?: number;
  /** Series handicap pins awarded (not including scratch). */
  handicap_pins?: number;
  /** Series total with handicap (scratch + handicap pins). */
  score_handicap: number;
  sort_score: number;
  prize_amount?: number | null;
  user_id?: number | null;
  event_participant_id?: number | null;
  display_name: string;
  team_id?: number | null;
  team_number?: number | null;
  team_name?: string | null;
  is_team_row: boolean;
  bowlers: EventStandingsBowler[];
  games?: EventStandingsGameScore[];
  member_results?: EventStandingsMemberResults[];
  squad_ids: number[];
  /** 0-based pod index when this round is Pods / Beat the pair. */
  pod_index?: number | null;
  pod_label?: string | null;
  /** advance | prize | place — stepladder feeder board. */
  standing_status?: string | null;
  standing_status_label?: string | null;
}

export interface StepladderStandingsSide {
  side: number;
  display_name: string;
  team_id?: number | null;
  event_participant_id?: number | null;
  user_id?: number | null;
  seed?: number | null;
  qualifying_score?: number | null;
  game_scores: number[];
  match_total?: number | null;
  is_winner: boolean;
  is_tbd: boolean;
  /** Elimination place earned in this match (loser, or final winner). */
  place?: number | null;
  prize_amount?: number | null;
}

export interface StepladderStandingsMatch {
  match_series_id: number;
  match_label: string;
  display_order: number;
  status: string;
  winner_side?: number | null;
  sides: StepladderStandingsSide[];
}

export interface StepladderStandingsBlock {
  title: string;
  champion_name?: string | null;
  champion_prize?: number | null;
  matches: StepladderStandingsMatch[];
}

export interface EventStandingsSection {
  event_id: number;
  event_name: string;
  event_format: string;
  basis_label: string;
  round_id?: number | null;
  round_number?: number | null;
  squad_id?: number | null;
  squad_name?: string | null;
  is_complete: boolean;
  /** True when this round's format awards match/format bonus pins. */
  includes_bonus?: boolean;
  /** True when the selected round is Baker (team score only; no per-bowler Results). */
  is_baker?: boolean;
  note?: string | null;
  /** stepladder_final when Final ends in a climb. */
  layout?: string | null;
  feeder_round_id?: number | null;
  feeder_round_number?: number | null;
  feeder_basis_label?: string | null;
  stepladder?: StepladderStandingsBlock | null;
  rows: EventStandingsRow[];
  /** 0-based index of the last cashing/advancing row when show_cut_line is on. */
  cut_line_after_index?: number | null;
}

export interface EventStandingsReport {
  report_type: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  scope: EventStandingsScope;
  basis: EventStandingsBasis;
  round_number?: number | null;
  include_prizes: boolean;
  include_handicap: boolean;
  show_cut_line?: boolean;
  /** Present when report_type is single_game. */
  game_number?: number | null;
  sections: EventStandingsSection[];
}

export type EventRosterScope = 'event' | 'squad';

export interface EventRosterReportRequest {
  tournament_id: number;
  event_id: number;
  squad_id?: number | null;
  scope: EventRosterScope;
  include_checkin?: boolean;
  include_usbc?: boolean;
  include_average?: boolean;
  include_handicap?: boolean;
  include_lane?: boolean;
  include_paid?: boolean;
}

export interface EventRosterReportRow {
  event_participant_id: number;
  user_id?: number | null;
  display_name: string;
  usbc_id?: string | null;
  entry_number: number;
  is_reentry: boolean;
  status: string;
  team_id?: number | null;
  team_name?: string | null;
  squad_id?: number | null;
  squad_name?: string | null;
  assigned_lane?: number | null;
  pair_label?: string | null;
  qualifying_average?: number | null;
  handicap?: number | null;
  checked_in: boolean;
  paid_amount?: number | null;
  entry_fee?: number | null;
  balance_due?: number | null;
}

export interface EventRosterReport {
  report_type: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  event_format: string;
  scope: EventRosterScope;
  squad_id?: number | null;
  squad_name?: string | null;
  include_checkin: boolean;
  include_usbc: boolean;
  include_average: boolean;
  include_handicap: boolean;
  include_lane: boolean;
  include_paid: boolean;
  rows: EventRosterReportRow[];
}

export interface EventFinancialsReportRequest {
  tournament_id: number;
  event_id: number;
}

export interface EventFinancialsPrizeLine {
  place: number;
  place_label: string;
  amount: number;
}

export interface EventFinancialsReport {
  report_type: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  event_format: string;
  approved_entries: number;
  reentry_count: number;
  entry_fee: number;
  reentry_fee?: number | null;
  entry_fees_billed: number;
  amount_collected: number;
  balance_due: number;
  added_money: number;
  house_cut_type: string;
  house_cut_percentage: number;
  house_cut_amount?: number | null;
  house_cut_total: number;
  lineage_fee_mode: string;
  lineage_per_game: number;
  lineage_amount: number;
  lineage_games: number;
  lineage_max_games: number;
  lineage_billed_games?: number | null;
  lineage_total: number;
  net_prize_pool: number;
  prizes_allocated: number;
  unallocated: number;
  lineage_bundled_in_house_cut: boolean;
  prize_lines: EventFinancialsPrizeLine[];
}

export type SideActionFinancialsScope = 'event' | 'tournament';

export interface SideActionFinancialsReportRequest {
  tournament_id: number;
  event_id?: number | null;
  scope: SideActionFinancialsScope;
}

export interface SideActionFinancialsTotals {
  side_action_count: number;
  entry_count: number;
  intake: number;
  fees: number;
  payouts: number;
  refunds: number;
  net: number;
}

export interface SideActionFinancialsRow {
  side_action_id: number;
  name: string;
  side_action_type: string;
  status: string;
  is_projected: boolean;
  entry_fee: number;
  entry_count: number;
  intake: number;
  fees: number;
  payouts: number;
  refunds: number;
  net: number;
  prize_summary: string;
}

export interface SideActionFinancialsEventSection {
  event_id: number;
  event_name: string;
  totals: SideActionFinancialsTotals;
  side_actions: SideActionFinancialsRow[];
}

export interface SideActionFinancialsReport {
  report_type: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  scope: SideActionFinancialsScope;
  event_id?: number | null;
  totals: SideActionFinancialsTotals;
  sections: SideActionFinancialsEventSection[];
}

export interface SingleGameResultsReportRequest {
  tournament_id: number;
  event_id?: number | null;
  squad_id?: number | null;
  scope: EventStandingsScope;
  round_number: number;
  game_number: number;
  include_handicap?: boolean;
}

export type PrizeFundScope = 'event' | 'tournament';

export interface PrizeFundReportRequest {
  tournament_id: number;
  event_id?: number | null;
  scope: PrizeFundScope;
  include_fund_summary?: boolean;
  include_winners?: boolean;
}

export interface PrizeFundBowler {
  user_id?: number | null;
  event_participant_id?: number | null;
  display_name: string;
}

export interface PrizeFundFundSummary {
  approved_entries: number;
  entry_fee: number;
  added_money: number;
  house_cut_type: string;
  house_cut_percentage: number;
  house_cut_amount?: number | null;
  house_cut_total: number;
  lineage_fee_mode: string;
  lineage_per_game: number;
  lineage_amount: number;
  lineage_games: number;
  lineage_max_games: number;
  lineage_billed_games?: number | null;
  lineage_total: number;
  net_prize_pool: number;
}

export interface PrizeFundPlaceRow {
  place: number;
  place_label: string;
  amount: number;
  display_name?: string | null;
  team_id?: number | null;
  team_number?: number | null;
  team_name?: string | null;
  is_team_row: boolean;
  bowlers: PrizeFundBowler[];
}

export interface PrizeFundEventSection {
  event_id: number;
  event_name: string;
  event_format: string;
  winners_available: boolean;
  include_winners: boolean;
  fund_summary?: PrizeFundFundSummary | null;
  rows: PrizeFundPlaceRow[];
}

export interface PrizeFundReport {
  report_type: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  scope: PrizeFundScope;
  event_id?: number | null;
  include_fund_summary: boolean;
  include_winners: boolean;
  sections: PrizeFundEventSection[];
}

export type ScoreSheetLayout = 'bowler' | 'team' | 'pair' | 'round_robin';

export interface ScoreSheetsReportRequest {
  tournament_id: number;
  event_id: number;
  round_number: number;
  layout: ScoreSheetLayout;
  squad_id?: number | null;
  include_individual_handicap?: boolean;
  include_team_handicap?: boolean;
}

export interface ScoreSheetGameHeader {
  game_number: number;
  assigned_lane?: number | null;
  lane_slot?: number | null;
  lane_label?: string | null;
  pair_label?: string | null;
}

export interface ScoreSheetBowlerRow {
  display_name: string;
  event_participant_id?: number | null;
  user_id?: number | null;
  qualifying_average?: number | null;
  handicap?: number | null;
  is_blank_row: boolean;
}

export interface ScoreSheetBonusPins {
  win: number;
  tie: number;
  loss: number;
}

export interface ScoreSheetRrMatchRow {
  game_number: number;
  is_game_start: boolean;
  assigned_lane?: number | null;
  lane_slot?: number | null;
  lane_label?: string | null;
  pair_label?: string | null;
  bowler_name?: string | null;
  opponent_team_id?: number | null;
  opponent_name?: string | null;
  opponent_initials?: string | null;
}

export interface ScoreSheetPanel {
  panel_key: string;
  title: string;
  is_team: boolean;
  team_id?: number | null;
  team_number?: number | null;
  squad_name?: string | null;
  home_lane?: number | null;
  home_lane_label?: string | null;
  home_pair_label?: string | null;
  team_average?: number | null;
  team_handicap?: number | null;
  bowlers: ScoreSheetBowlerRow[];
  games: ScoreSheetGameHeader[];
  match_rows?: ScoreSheetRrMatchRow[];
}

export interface ScoreSheetPage {
  sheet_key: string;
  title: string;
  pair_label?: string | null;
  game_start: number;
  game_end: number;
  panels: ScoreSheetPanel[];
}

export interface ScoreSheetsReport {
  report_type: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  event_format: string;
  team_size?: number | null;
  round_id: number;
  round_number: number;
  game_count: number;
  max_games_per_page: number;
  squad_id?: number | null;
  squad_name?: string | null;
  layout: ScoreSheetLayout;
  include_individual_handicap: boolean;
  include_team_handicap: boolean;
  is_baker?: boolean;
  scores_per_game?: number;
  bonus_pins?: ScoreSheetBonusPins | null;
  sheets: ScoreSheetPage[];
}

export interface LaneAssignmentSheetsReportRequest {
  tournament_id: number;
  event_id: number;
  round_number: number;
  squad_id?: number | null;
}

export interface LaneAssignmentGameCell {
  game_number: number;
  assigned_lane?: number | null;
  lane_slot?: number | null;
  lane_label?: string | null;
  pair_label?: string | null;
  is_position_round?: boolean;
}

export interface LaneAssignmentUnit {
  unit_key: string;
  title: string;
  is_team: boolean;
  team_id?: number | null;
  team_number?: number | null;
  squad_name?: string | null;
  home_lane?: number | null;
  home_lane_label?: string | null;
  home_pair_label?: string | null;
  games: LaneAssignmentGameCell[];
}

export interface LaneAssignmentSheetPage {
  sheet_key: string;
  title: string;
  game_start: number;
  game_end: number;
  units: LaneAssignmentUnit[];
}

export interface LaneAssignmentSheetsReport {
  report_type: string;
  tournament_id: number;
  tournament_name: string;
  director_name?: string | null;
  event_id: number;
  event_name: string;
  event_format: string;
  team_size?: number | null;
  round_id: number;
  round_number: number;
  game_count: number;
  max_games_per_page: number;
  squad_id?: number | null;
  squad_name?: string | null;
  position_round_game?: number | null;
  movement_label: string;
  sheets: LaneAssignmentSheetPage[];
}

export interface EventScoresExcelRequest {
  tournament_id: number;
  event_id?: number | null;
  squad_id?: number | null;
  scope: EventStandingsScope;
}

const EVENT_REPORT_ENDPOINTS = {
  STANDINGS: '/events/reports/standings',
  ROSTER: '/events/reports/roster',
  FINANCIALS: '/events/reports/financials',
  SIDE_ACTION_FINANCIALS: '/events/reports/side-action-financials',
  SINGLE_GAME: '/events/reports/single-game',
  PRIZE_FUND: '/events/reports/prize-fund',
  SCORE_SHEETS: '/events/reports/score-sheets',
  LANE_ASSIGNMENT_SHEETS: '/events/reports/lane-assignment-sheets',
  SCORES_EXCEL: '/events/reports/scores/excel',
};

export const EventReportsAPI = {
  getStandingsReport: async (
    body: EventStandingsReportRequest
  ): Promise<EventStandingsReport> => {
    const response = await axiosInstance.post<EventStandingsReport>(
      EVENT_REPORT_ENDPOINTS.STANDINGS,
      body
    );
    return response.data;
  },
  getRosterReport: async (
    body: EventRosterReportRequest
  ): Promise<EventRosterReport> => {
    const response = await axiosInstance.post<EventRosterReport>(
      EVENT_REPORT_ENDPOINTS.ROSTER,
      body
    );
    return response.data;
  },
  getFinancialsReport: async (
    body: EventFinancialsReportRequest
  ): Promise<EventFinancialsReport> => {
    const response = await axiosInstance.post<EventFinancialsReport>(
      EVENT_REPORT_ENDPOINTS.FINANCIALS,
      body
    );
    return response.data;
  },
  getSideActionFinancialsReport: async (
    body: SideActionFinancialsReportRequest
  ): Promise<SideActionFinancialsReport> => {
    const response = await axiosInstance.post<SideActionFinancialsReport>(
      EVENT_REPORT_ENDPOINTS.SIDE_ACTION_FINANCIALS,
      body
    );
    return response.data;
  },
  getSingleGameResultsReport: async (
    body: SingleGameResultsReportRequest
  ): Promise<EventStandingsReport> => {
    const response = await axiosInstance.post<EventStandingsReport>(
      EVENT_REPORT_ENDPOINTS.SINGLE_GAME,
      body
    );
    return response.data;
  },
  getPrizeFundReport: async (
    body: PrizeFundReportRequest
  ): Promise<PrizeFundReport> => {
    const response = await axiosInstance.post<PrizeFundReport>(
      EVENT_REPORT_ENDPOINTS.PRIZE_FUND,
      body
    );
    return response.data;
  },
  getScoreSheetsReport: async (
    body: ScoreSheetsReportRequest
  ): Promise<ScoreSheetsReport> => {
    const response = await axiosInstance.post<ScoreSheetsReport>(
      EVENT_REPORT_ENDPOINTS.SCORE_SHEETS,
      body
    );
    return response.data;
  },
  getLaneAssignmentSheetsReport: async (
    body: LaneAssignmentSheetsReportRequest
  ): Promise<LaneAssignmentSheetsReport> => {
    const response = await axiosInstance.post<LaneAssignmentSheetsReport>(
      EVENT_REPORT_ENDPOINTS.LANE_ASSIGNMENT_SHEETS,
      body
    );
    return response.data;
  },
  downloadScoresExcel: async (body: EventScoresExcelRequest): Promise<Blob> => {
    try {
      const response = await axiosInstance.post(EVENT_REPORT_ENDPOINTS.SCORES_EXCEL, body, {
        responseType: 'blob',
      });
      return response.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text) as {
            error?: string;
            message?: string;
            detail?: string;
          };
          const msg =
            (typeof parsed.error === 'string' && parsed.error) ||
            (typeof parsed.message === 'string' && parsed.message) ||
            (typeof parsed.detail === 'string' && parsed.detail) ||
            null;
          if (msg) {
            throw new Error(msg);
          }
        } catch (inner) {
          if (
            inner instanceof Error &&
            inner.message &&
            inner.message !== 'Unexpected end of JSON input'
          ) {
            throw inner;
          }
        }
      }
      throw err;
    }
  },
};
