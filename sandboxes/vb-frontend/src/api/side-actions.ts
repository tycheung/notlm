import axiosInstance from '../api/axios';
import {
  SideAction,
  SideActionPool,
  CreateSideActionRequest,
  UpdateSideActionRequest,
  SideActionType,
  type MysteryDoublesDrawPairsResult,
  type MysteryDoublesStandings,
  type MysteryGameStandings,
  type LoveDoublesStandings,
  type AlibiDoublesStandings,
  type AlibiDoublesPairList,
  type AlibiDoublesEligiblePartners,
} from '../types/side_action';
import type { Bracket } from '../utils/bracketEngine/types';
import { SideActionReportsAPI } from './side-action-reports';

export type {
  SignupSheetReport,
  EntrySummaryPotScenario,
  EntrySummaryBracketSetup,
  EntrySummaryReport,
  AliveListDisplayMode,
  AliveListOpponent,
  AliveListRow,
  AliveListReport,
  BracketsReport,
  HighGameEntrySummaryPot,
  HighGameEntrySummaryReport,
  HighGameReportListMode,
  HighSetEntrySummaryPot,
  HighSetEntrySummaryReport,
  HighSetReportListMode,
  HighSetReport,
  MysteryDoublesEntrySummaryPot,
  MysteryDoublesEntrySummaryReport,
  MysteryDoublesReportListMode,
  MysteryDoublesReport,
  MysteryGameEntrySummaryPot,
  MysteryGameEntrySummaryReport,
  MysteryGameReport,
  LoveDoublesEntrySummaryPot,
  LoveDoublesEntrySummaryReport,
  LoveDoublesReportListMode,
  LoveDoublesReport,
  AlibiDoublesReportListMode,
  AlibiDoublesReport,
  AlibiDoublesEntrySummaryReport,
  EliminatorReportDisplayMode,
  EliminatorEntrySummaryPot,
  EliminatorEntrySummaryReport,
  EliminatorReport,
  HighGameReport,
  PayoutReport,
  IndividualBracketGameResult,
  IndividualBracketGameSlot,
  IndividualBracketReport,
} from './side-action-reports';

export { SideActionReportsAPI } from './side-action-reports';

export interface BracketEngineQuota {
  user_id: number;
  count: number;
  quota: number;
  unused: number;
}

export interface BowlerBracketStatsRow {
  entered: number;
  r1w: number;
  r1l: number;
  r2w: number;
  r2l: number;
  finals: number;
  first: number;
  second: number;
  third?: number;
  fourth?: number;
  split: number;
  reward: number;
}

export type BowlerBracketStatsMap = Record<string, BowlerBracketStatsRow>;

export interface BracketEnginePayouts {
  first: number;
  second: number;
  third?: number;
  fourth?: number;
  fee?: number;
}

export interface BracketEngineFinancialsSummary {
  total_collected: number;
  total_refunds: number;
  winnings: number;
  total_payout: number;
  fees: number;
  unplaced_entries: number;
  bracket_count: number;
  rollover?: {
    enabled?: boolean;
    opted_in_user_ids?: number[];
    out?: Array<{ target_side_action_id: number; user_id: number; count: number }>;
    in?: Array<{
      source_side_action_id?: number | null;
      user_id: number;
      count: number;
      from_cluster?: number[];
    }>;
    refunded?: number;
    batch_cluster?: number[];
  };
}

export interface BracketEngineFinancialsReport {
  side_action_id: number;
  pool_id: number;
  squad_id: number;
  game_numbers: number[];
  max_brackets: number;
  bracket_count: number;
  total_tickets: number;
  unplaced_tickets: number;
  entry_fee: number;
  payouts: BracketEnginePayouts;
  bye_payouts?: BracketEnginePayouts;
  slots_full?: number;
  quotas: BracketEngineQuota[];
  stats: BowlerBracketStatsMap;
  financials: BracketEngineFinancialsSummary;
  brackets: Bracket[];
  user_display_names?: Record<number, string>;
  entry_unit?: 'bowler' | 'team';
  rng_seed?: number | null;
  run_id?: number;
  version?: number;
}

export interface BracketEngineGenerateResult {
  message: string;
  side_action_id: number;
  pool_id: number;
  squad_id: number;
  bracket_count: number;
  unplaced_tickets: number;
  financials: BracketEngineFinancialsSummary;
  rng_seed?: number | null;
  run_id?: number | null;
  version?: number | null;
  batch?: boolean;
  linked_side_action_ids?: number[];
  linked_pool_ids?: number[];
  results?: Array<{
    side_action_id: number;
    pool_id: number;
    bracket_count: number;
    unplaced_tickets: number;
    financials: BracketEngineFinancialsSummary;
    rng_seed?: number | null;
    run_id?: number | null;
    version?: number | null;
  }>;
}

export interface RosterSideActionPoolColumn {
  pool_id: number;
  squad_id: number;
  squad_name: string;
  entry_fee: number;
  input_type: 'number' | 'checkbox';
  max_entries_per_user: number;
}

export interface RosterSideActionColumn {
  side_action_id: number;
  name: string;
  side_action_type: string;
  entry_fee: number;
  input_type: 'number' | 'checkbox';
  max_entries_per_user: number;
  entry_unit?: 'bowler' | 'team';
  pools: RosterSideActionPoolColumn[];
}

export interface RosterSquadRollover {
  rollover_enabled?: boolean;
  rollover_target_side_action_ids?: number[];
}

export interface RosterSideActionSignupPoolCell {
  pool_id: number;
  squad_id: number;
  squad_name: string;
  quantity: number;
  entry_ids: number[];
  paid_count: number;
  is_eligible: boolean;
  is_all?: boolean;
  all_estimate?: number | null;
  team_has_entry?: boolean;
  team_entry_holder_user_id?: number | null;
}

export interface RosterSideActionSignupCell {
  quantity: number;
  entry_ids: number[];
  pools: RosterSideActionSignupPoolCell[];
}

export interface RosterSideActionSignupRow {
  user_id: number;
  participant_id: number;
  name: string;
  email?: string | null;
  usbc_id?: string | null;
  qualifying_average?: number | null;
  team_id?: number | null;
  team_name?: string | null;
  squad_ids?: number[];
  rollover_by_squad?: Record<string, RosterSquadRollover>;
  signups: Record<string, RosterSideActionSignupCell>;
  total_owed: number;
  total_paid: number;
}

export interface RosterSideActionSignupsData {
  side_actions: RosterSideActionColumn[];
  rows: RosterSideActionSignupRow[];
}

export interface RosterSideActionSignupUpdate {
  tournament_id: number;
  event_id: number;
  user_id: number;
  side_action_id?: number;
  pool_id?: number;
  quantity?: number;
  enrolled?: boolean;
  is_all?: boolean;
  squad_id?: number;
  enroll_all_eligible_sidepots?: boolean;
  rollover_enabled?: boolean;
  rollover_target_side_action_ids?: number[];
  total_paid?: number;
}

export interface SideActionEntrantPool {
  pool_id: number;
  squad_id: number;
  squad_name: string;
  entry_count: number;
}

export interface SideActionEntrantRow {
  user_id: number;
  display_name: string;
  entry_count: number;
  pool_id?: number | null;
  squad_id?: number | null;
  squad_name?: string | null;
  pools: SideActionEntrantPool[];
}

const SIDE_ACTION_ENDPOINTS = {
  BASE: '/side-actions',
  SIDE_ACTION: (id: number) => `/side-actions/${id}`,
  POOLS: (id: number) => `/side-actions/${id}/pools`,
  RESET_POOL_CONFIGURATION: (id: number, poolId: number) =>
    `/side-actions/${id}/pools/${poolId}/reset-configuration`,
  UNLOCK_POOL_ENTRIES: (id: number, poolId: number) =>
    `/side-actions/${id}/pools/${poolId}/unlock-entries`,
  HIGH_GAME_STANDINGS: (id: number) => `/side-actions/${id}/high-game/standings`,
  HIGH_SET_STANDINGS: (id: number) => `/side-actions/${id}/high-set/standings`,
  ELIMINATOR_STANDINGS: (id: number) => `/side-actions/${id}/eliminator/standings`,
  MYSTERY_DOUBLES_STANDINGS: (id: number) =>
    `/side-actions/${id}/mystery-doubles/standings`,
  MYSTERY_DOUBLES_DRAW_PAIRS: (id: number) =>
    `/side-actions/${id}/mystery-doubles/draw-pairs`,
  MYSTERY_GAME_STANDINGS: (id: number) =>
    `/side-actions/${id}/mystery-game/standings`,
  MYSTERY_GAME_SPIN: (id: number) => `/side-actions/${id}/mystery-game/spin`,
  LOVE_DOUBLES_STANDINGS: (id: number) =>
    `/side-actions/${id}/love-doubles/standings`,
  ALIBI_DOUBLES_STANDINGS: (id: number) =>
    `/side-actions/${id}/alibi-doubles/standings`,
  ALIBI_DOUBLES_PAIRS: (id: number) => `/side-actions/${id}/alibi-doubles/pairs`,
  ALIBI_DOUBLES_PARTNERS: (id: number) =>
    `/side-actions/${id}/alibi-doubles/eligible-partners`,
  SIDE_ACTION_ENTRY: (entryId: number) => `/side-actions/entries/${entryId}`,
  BRACKET_ENGINE_GENERATE: (id: number) => `/side-actions/${id}/bracket-engine/generate`,
  BRACKET_ENGINE_FINANCIALS: (id: number) => `/side-actions/${id}/bracket-engine/financials`,
  BRACKET_ENGINE_SYNC_SCORES: (id: number) => `/side-actions/${id}/bracket-engine/sync-scores`,
  LOCK_ENTRIES: (id: number) => `/side-actions/${id}/lock-entries`,
  ENTRANTS: (id: number) => `/side-actions/${id}/entrants`,
  EVENT_LOCK_STATUS: (eventId: number) =>
    `/side-actions/event/${eventId}/lock-status`,
  EVENT_LOCK_ALL: (eventId: number) =>
    `/side-actions/event/${eventId}/lock-all-entries`,
  ROSTER_SIGNUPS: '/side-actions/roster-signups',
};

export const SideActionsAPI = {
  /**
   * Get all side actions
   */
  getSideActions: async (params: {
    tournament_id: number;
    event_id: number;
    side_action_type?: SideActionType;
    active_only?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<SideAction[]> => {
    const response = await axiosInstance.get<SideAction[]>(SIDE_ACTION_ENDPOINTS.BASE, { params });
    return response.data;
  },

  /**
   * Create a new side action
   */
  createSideAction: async (data: CreateSideActionRequest): Promise<SideAction> => {
    const response = await axiosInstance.post<SideAction>(SIDE_ACTION_ENDPOINTS.BASE, data);
    return response.data;
  },

  bulkCopySideActions: async (data: {
    copies: Array<{
      source_side_action_id: number;
      name: string;
      destination_squad_id: number;
    }>;
  }): Promise<{ created: SideAction[]; created_count: number }> => {
    const response = await axiosInstance.post<{ created: SideAction[]; created_count: number }>(
      `${SIDE_ACTION_ENDPOINTS.BASE}/copy-bulk`,
      data
    );
    return response.data;
  },

  /**
   * Get a specific side action by ID
   */
  getSideAction: async (id: number): Promise<SideAction> => {
    const response = await axiosInstance.get<SideAction>(SIDE_ACTION_ENDPOINTS.SIDE_ACTION(id));
    return response.data;
  },

  getSideActionPools: async (id: number): Promise<SideActionPool[]> => {
    const response = await axiosInstance.get<SideActionPool[]>(
      SIDE_ACTION_ENDPOINTS.POOLS(id)
    );
    return response.data;
  },

  resetSideActionPoolConfiguration: async (
    id: number,
    poolId: number
  ): Promise<SideActionPool> => {
    const response = await axiosInstance.post<SideActionPool>(
      SIDE_ACTION_ENDPOINTS.RESET_POOL_CONFIGURATION(id, poolId)
    );
    return response.data;
  },

  unlockSideActionPoolEntries: async (
    id: number,
    poolId: number
  ): Promise<SideActionPool> => {
    const response = await axiosInstance.post<SideActionPool>(
      SIDE_ACTION_ENDPOINTS.UNLOCK_POOL_ENTRIES(id, poolId)
    );
    return response.data;
  },

  /**
   * Update a side action
   */
  updateSideAction: async (id: number, data: UpdateSideActionRequest): Promise<SideAction> => {
    const response = await axiosInstance.put<SideAction>(SIDE_ACTION_ENDPOINTS.SIDE_ACTION(id), data);
    return response.data;
  },

  /**
   * Soft-delete a side action (marks inactive).
   */
  deleteSideAction: async (id: number): Promise<void> => {
    await axiosInstance.delete(SIDE_ACTION_ENDPOINTS.SIDE_ACTION(id));
  },

  getHighGameStandings: async (
    sideActionId: number,
    params?: { pool_id?: number; squad_id?: number; division?: string }
  ): Promise<{
    report_type: string;
    side_action_id: number;
    side_action_name: string;
    event_id?: number | null;
    money_visible?: boolean;
    payout_mode: 'per_game' | 'combined';
    handicap_mode: 'scratch' | 'handicap';
    game_numbers: number[];
    entry_unit?: 'bowler' | 'team';
    fund: {
      entry_count: number;
      entry_fee: number;
      collected: number;
      expenses: number;
      prize_fund: number;
      places_sum: number;
      places_sum_all_games: number;
      payout_ready: boolean;
      overcommitted: boolean;
    };
    pool_funds: Array<{
      pool_id: number;
      squad_id: number;
      entry_count: number;
      entry_fee: number;
      collected: number;
      expenses: number;
      prize_fund: number;
      places_sum: number;
      places_sum_all_games: number;
      payout_ready: boolean;
      overcommitted: boolean;
    }>;
    pools: Array<{
      pool_id: number;
      squad_id?: number | null;
      squad_name?: string | null;
      division: string;
      game_number?: number | null;
      label: string;
      entry_count: number;
      is_complete: boolean;
      game_numbers?: number[];
      scoring_mode?: 'per_game' | 'combined';
      rows: Array<{
        user_id: number;
        display_name: string;
        game_number?: number | null;
        score: number;
        place?: number | null;
        payout: number;
        provisional_payout: number;
        is_complete: boolean;
        division?: string | null;
      }>;
    }>;
  }> => {
    const response = await axiosInstance.get(
      SIDE_ACTION_ENDPOINTS.HIGH_GAME_STANDINGS(sideActionId),
      { params }
    );
    return response.data;
  },

  getHighSetStandings: async (
    sideActionId: number,
    params?: { pool_id?: number; squad_id?: number; division?: string }
  ): Promise<{
    report_type: string;
    side_action_id: number;
    side_action_name: string;
    event_id?: number | null;
    money_visible?: boolean;
    handicap_mode: 'scratch' | 'handicap';
    series_mode: 'sum' | 'best_n';
    best_n?: number | null;
    game_numbers: number[];
    entry_unit?: 'bowler' | 'team';
    fund: {
      entry_count: number;
      entry_fee: number;
      collected: number;
      expenses: number;
      prize_fund: number;
      places_sum: number;
      places_sum_all_games: number;
      payout_ready: boolean;
      overcommitted: boolean;
    };
    pool_funds: Array<{
      pool_id: number;
      squad_id: number;
      entry_count: number;
      entry_fee: number;
      collected: number;
      expenses: number;
      prize_fund: number;
      places_sum: number;
      places_sum_all_games: number;
      payout_ready: boolean;
      overcommitted: boolean;
    }>;
    pools: Array<{
      pool_id: number;
      squad_id?: number | null;
      squad_name?: string | null;
      division: string;
      label: string;
      entry_count: number;
      is_complete: boolean;
      series_mode: 'sum' | 'best_n';
      best_n?: number | null;
      game_numbers?: number[];
      scoring_mode?: 'sum' | 'best_n';
      prize_fund: number;
      places_sum: number;
      rows: Array<{
        user_id: number;
        display_name: string;
        squad_id?: number | null;
        score: number;
        game_scores?: Record<string, number | null>;
        place?: number | null;
        payout: number;
        provisional_payout: number;
        is_complete: boolean;
        division?: string | null;
      }>;
      fund: Record<string, number | boolean | null>;
    }>;
  }> => {
    const response = await axiosInstance.get(
      SIDE_ACTION_ENDPOINTS.HIGH_SET_STANDINGS(sideActionId),
      { params }
    );
    return response.data;
  },

  /**
   * Live Eliminator cut schedule / standings from event Game scores
   */
  getEliminatorStandings: async (
    sideActionId: number,
    params?: { pool_id?: number; squad_id?: number }
  ): Promise<{
    report_type: string;
    side_action_id: number;
    side_action_name: string;
    event_id?: number | null;
    money_visible?: boolean;
    handicap_mode: 'scratch' | 'handicap';
    game_numbers: number[];
    entry_unit?: 'bowler' | 'team';
    drop_mode: 'percentage' | 'flat';
    drop_amount: number;
    drop_schedule?: 'uniform' | 'varied';
    drop_amounts_by_game?: Record<string, number>;
    round_mode?: 'up' | 'down' | null;
    warning?: string | null;
    final_alive: number;
    payout_game: number;
    projection: {
      entry_count: number;
      game_numbers: number[];
      drop_mode: 'percentage' | 'flat';
      drop_amount: number;
      drop_schedule?: 'uniform' | 'varied';
      drop_amounts_by_game?: Record<string, number>;
      round_mode?: 'up' | 'down' | null;
      steps: Array<{
        game_number: number;
        role: 'cut' | 'payout';
        starting_alive: number;
        dropped: number;
        surviving: number;
        drop_amount?: number;
      }>;
      final_alive: number;
      payout_game: number;
      zero_at_final: boolean;
      emptied_before_final: boolean;
      has_warning: boolean;
    };
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
    pool_funds: Array<{
      pool_id: number;
      squad_id: number;
      entry_count: number;
      entry_fee: number;
      collected: number;
      expenses: number;
      prize_fund: number;
      places_sum: number;
      payout_ready: boolean;
      overcommitted: boolean;
    }>;
    pools: Array<{
      pool_id: number;
      squad_id: number;
      squad_name?: string | null;
      game_numbers: number[];
      projection: {
        entry_count: number;
        game_numbers: number[];
        drop_mode: 'percentage' | 'flat';
        drop_amount: number;
        round_mode?: 'up' | 'down' | null;
        steps: Array<{
          game_number: number;
          role: 'cut' | 'payout';
          starting_alive: number;
          dropped: number;
          surviving: number;
        }>;
        final_alive: number;
        payout_game: number;
        zero_at_final: boolean;
        emptied_before_final: boolean;
        has_warning: boolean;
      };
      is_complete: boolean;
      warning?: string | null;
      fund: {
        payout_ready: boolean;
        overcommitted: boolean;
        prize_fund: number;
      };
      rounds: Array<{
        game_number: number;
        role: 'cut' | 'payout';
        label: string;
        starting_alive: number;
        dropped: number;
        surviving: number;
        rows: Array<{
          user_id: number;
          display_name: string;
          squad_id?: number | null;
          squad_name?: string | null;
          score?: number | null;
          rank?: number | null;
          status: 'alive' | 'eliminated';
          payout: number;
          provisional_payout: number;
          place?: number | null;
        }>;
      }>;
      final_alive: number;
      payout_game: number;
    }>;
    rounds: Array<{
      game_number: number;
      role: 'cut' | 'payout';
      label: string;
      starting_alive: number;
      dropped: number;
      surviving: number;
      rows: Array<{
        user_id: number;
        display_name: string;
        score?: number | null;
        rank?: number | null;
        status: 'alive' | 'eliminated';
        payout: number;
        place?: number | null;
      }>;
    }>;
  }> => {
    const response = await axiosInstance.get(
      SIDE_ACTION_ENDPOINTS.ELIMINATOR_STANDINGS(sideActionId),
      { params }
    );
    return response.data;
  },

  getMysteryDoublesStandings: async (
    sideActionId: number,
    params?: { pool_id?: number; squad_id?: number; division?: string }
  ): Promise<MysteryDoublesStandings> => {
    const response = await axiosInstance.get(
      SIDE_ACTION_ENDPOINTS.MYSTERY_DOUBLES_STANDINGS(sideActionId),
      { params }
    );
    return response.data;
  },

  drawMysteryDoublesPairs: async (
    sideActionId: number,
    body?: { pool_id?: number; rng_seed?: number }
  ): Promise<MysteryDoublesDrawPairsResult> => {
    const response = await axiosInstance.post(
      SIDE_ACTION_ENDPOINTS.MYSTERY_DOUBLES_DRAW_PAIRS(sideActionId),
      body ?? {}
    );
    return response.data;
  },

  getMysteryGameStandings: async (
    sideActionId: number,
    params?: { pool_id?: number; squad_id?: number }
  ): Promise<MysteryGameStandings> => {
    const response = await axiosInstance.get(
      SIDE_ACTION_ENDPOINTS.MYSTERY_GAME_STANDINGS(sideActionId),
      { params }
    );
    return response.data;
  },

  spinMysteryGame: async (
    sideActionId: number,
    body?: { pool_id?: number; rng_seed?: number }
  ): Promise<MysteryGameStandings> => {
    const response = await axiosInstance.post(
      SIDE_ACTION_ENDPOINTS.MYSTERY_GAME_SPIN(sideActionId),
      body ?? {}
    );
    return response.data;
  },

  getLoveDoublesStandings: async (
    sideActionId: number,
    params?: { pool_id?: number; squad_id?: number }
  ): Promise<LoveDoublesStandings> => {
    const response = await axiosInstance.get(
      SIDE_ACTION_ENDPOINTS.LOVE_DOUBLES_STANDINGS(sideActionId),
      { params }
    );
    return response.data;
  },

  getAlibiDoublesStandings: async (
    sideActionId: number,
    params?: { pool_id?: number; squad_id?: number }
  ): Promise<AlibiDoublesStandings> => {
    const response = await axiosInstance.get(
      SIDE_ACTION_ENDPOINTS.ALIBI_DOUBLES_STANDINGS(sideActionId),
      { params }
    );
    return response.data;
  },

  listAlibiDoublesPairs: async (
    sideActionId: number,
    params?: { pool_id?: number }
  ): Promise<AlibiDoublesPairList> => {
    const response = await axiosInstance.get(
      SIDE_ACTION_ENDPOINTS.ALIBI_DOUBLES_PAIRS(sideActionId),
      { params }
    );
    return response.data;
  },

  getAlibiDoublesEligiblePartners: async (
    sideActionId: number,
    params: { holder_user_id: number; pool_id: number }
  ): Promise<AlibiDoublesEligiblePartners> => {
    const response = await axiosInstance.get(
      SIDE_ACTION_ENDPOINTS.ALIBI_DOUBLES_PARTNERS(sideActionId),
      { params }
    );
    return response.data;
  },

  createAlibiDoublesPair: async (
    sideActionId: number,
    body: { holder_user_id: number; partner_user_id: number; pool_id: number }
  ) => {
    const response = await axiosInstance.post(
      SIDE_ACTION_ENDPOINTS.ALIBI_DOUBLES_PAIRS(sideActionId),
      body
    );
    return response.data;
  },

  deleteSideActionEntry: async (entryId: number): Promise<void> => {
    await axiosInstance.delete(SIDE_ACTION_ENDPOINTS.SIDE_ACTION_ENTRY(entryId));
  },

  generateBracketPots: async (
    sideActionId: number,
    poolId: number,
    rngSeed?: number | null
  ): Promise<BracketEngineGenerateResult> => {
    const response = await axiosInstance.post<BracketEngineGenerateResult>(
      SIDE_ACTION_ENDPOINTS.BRACKET_ENGINE_GENERATE(sideActionId),
      { pool_id: poolId, ...(rngSeed != null ? { rng_seed: rngSeed } : {}) }
    );
    return response.data;
  },

  syncBracketScores: async (
    sideActionId: number,
    poolId: number
  ): Promise<{ side_action_id: number; synced_games: number[]; details: unknown[] }> => {
    const response = await axiosInstance.post(
      SIDE_ACTION_ENDPOINTS.BRACKET_ENGINE_SYNC_SCORES(sideActionId),
      undefined,
      { params: { pool_id: poolId } }
    );
    return response.data;
  },

  getBracketEngineFinancials: async (
    sideActionId: number,
    poolId: number
  ): Promise<BracketEngineFinancialsReport> => {
    const response = await axiosInstance.get<BracketEngineFinancialsReport>(
      SIDE_ACTION_ENDPOINTS.BRACKET_ENGINE_FINANCIALS(sideActionId),
      { params: { pool_id: poolId } }
    );
    return response.data;
  },

  lockSideActionEntries: async (sideActionId: number): Promise<SideAction> => {
    const response = await axiosInstance.post<SideAction>(
      SIDE_ACTION_ENDPOINTS.LOCK_ENTRIES(sideActionId)
    );
    return response.data;
  },

  lockAllEventEntries: async (
    eventId: number
  ): Promise<{
    event_id: number;
    locked_count: number;
    already_locked_count: number;
    locked_ids: number[];
    already_locked_ids: number[];
    all_locked: boolean;
  }> => {
    const response = await axiosInstance.post(
      SIDE_ACTION_ENDPOINTS.EVENT_LOCK_ALL(eventId)
    );
    return response.data;
  },

  getEventLockStatus: async (
    eventId: number
  ): Promise<{
    event_id: number;
    active_count: number;
    unlocked_count: number;
    all_locked: boolean;
    unlocked_ids: number[];
    unlocked_names: string[];
  }> => {
    const response = await axiosInstance.get(
      SIDE_ACTION_ENDPOINTS.EVENT_LOCK_STATUS(eventId)
    );
    return response.data;
  },

  getEntrants: async (
    sideActionId: number,
    poolId?: number
  ): Promise<SideActionEntrantRow[]> => {
    const response = await axiosInstance.get(SIDE_ACTION_ENDPOINTS.ENTRANTS(sideActionId), {
      params: poolId ? { pool_id: poolId } : undefined,
    });
    return response.data;
  },

  ...SideActionReportsAPI,

  getRosterSignups: async (
    tournamentId: number,
    eventId: number
  ): Promise<RosterSideActionSignupsData> => {
    const response = await axiosInstance.get<RosterSideActionSignupsData>(
      SIDE_ACTION_ENDPOINTS.ROSTER_SIGNUPS,
      { params: { tournament_id: tournamentId, event_id: eventId } }
    );
    return response.data;
  },

  updateRosterSignup: async (
    payload: RosterSideActionSignupUpdate
  ): Promise<RosterSideActionSignupsData> => {
    const response = await axiosInstance.put<RosterSideActionSignupsData>(
      SIDE_ACTION_ENDPOINTS.ROSTER_SIGNUPS,
      payload
    );
    return response.data;
  },
};
