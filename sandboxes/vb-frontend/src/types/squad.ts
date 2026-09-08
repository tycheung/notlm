import { GameRead } from './game';
import type { EventTeamWithMembers } from './event_team';

// Squad status enum
export enum SquadStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Base squad interface
export interface SquadBase {
  name: string;
  round_id: number;
  start_datetime: string;
  max_participants: number;
  game_count: number;
  status: SquadStatus;
  start_lane?: number | null;
  end_lane?: number | null;
  notes?: string | null;
  allows_reentry: boolean;
  /** True after squad lock-in; game shells exist and roster is frozen for this squad. */
  locked_in?: boolean;
}

// Squad creation interface
export interface SquadCreate extends SquadBase {
  created_by?: number;
}

// Squad update interface
export interface SquadUpdate {
  name?: string;
  start_datetime?: string;
  max_participants?: number;
  game_count?: number;
  status?: SquadStatus;
  start_lane?: number | null;
  end_lane?: number | null;
  notes?: string | null;
  allows_reentry?: boolean;
  updated_by?: number;
}

// Squad read interface (from API)
export interface SquadRead extends SquadBase {
  id: number;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
}

// Squad participant with user information
export interface SquadParticipantWithUser {
  id: number;
  squad_id: number;
  event_participant_id: number;
  assigned_lane?: number | null;
  position?: number | null;
  is_reentry: boolean;
  round_entry_number?: number | null;
  assigned_at: string;
  checked_in: boolean;
  checked_in_at?: string | null;
  notes?: string | null;
  // User information (flattened from event_participant.user)
  user_id: number;
  user_name: string;
  user_email?: string | null;
  user_usbc_id?: string | null;
  // Event participant data (now included from backend)
  qualifying_average?: number | null;
  handicap?: number | null;
  status: string;
  registered_at?: string | null;
  entry_number: number;
  entry_fee_paid: boolean;
  payment_status: boolean;
  team_id?: number | null;
  team_member_id?: number | null;
}

// Squad participant read interface (from API)
export interface SquadParticipantRead {
  id: number;
  squad_id: number;
  event_participant_id: number;
  assigned_lane?: number | null;
  position?: number | null;
  is_reentry: boolean;
  round_entry_number?: number | null;
  assigned_at: string;
  checked_in: boolean;
  checked_in_at?: string | null;
  notes?: string | null;
}

// Squad with participants
export interface SquadWithParticipants extends SquadRead {
  participants: SquadParticipantRead[];
}

// Squad with participants and user information
export interface SquadWithParticipantsAndUsers extends SquadRead {
  participants: SquadParticipantWithUser[];
}

// Squad with games
export interface SquadWithGames extends SquadRead {
  games: GameRead[];
}

// Squad assignment interface
export interface SquadAssignment {
  squad_id: number;
  event_participant_id: number;
  assigned_lane?: number | null;
  position?: number | null;
  is_reentry?: boolean; // Legacy field for backward compatibility
  round_entry_number?: number | null; // NEW: Round-level entry number
  notes?: string | null;
}

// Squad search interface
export interface SquadSearch {
  event_id?: number;
  round_id?: number;
  status?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

// Squad complete interface (for summary statistics)
export interface SquadComplete {
  squad_id: number;
  event_id: number;
  name: string;
  status: SquadStatus;
  start_datetime: string;
  game_count: number;
  max_participants: number;
  current_participants: number;
  available_spots: number;
  reentry_count: number;
  lane_count?: number | null;
  high_game: number;
  high_game_user_id: number;
  high_game_user_name: string;
  high_series: number;
  high_series_user_id: number;
  high_series_user_name: string;
  average_score: number;
}

// All types are already exported above 

// Batch operation types for squad assignments
export interface BatchAssignmentItem {
  event_participant_id: number;
  squad_id: number;
  assigned_lane?: number | null;
  position?: number | null;
  is_reentry: boolean;
  notes?: string | null;
}

export interface BatchAssignmentRequest {
  assignments: BatchAssignmentItem[];
}

export interface BatchAssignmentResponse {
  success_count: number;
  failed_count: number;
  results: Array<{
    event_participant_id: number;
    squad_id: number;
    success: boolean;
    squad_participant_id?: number;
    round_entry_number?: number;
    error?: string;
  }>;
}

// Batch operation types for squad re-entries
export interface BatchReentryItem {
  event_participant_id: number;
  squad_id: number;
  assigned_lane?: number | null;
  position?: number | null;
  notes?: string | null;
}

export interface BatchReentryRequest {
  reentries: BatchReentryItem[];
}

export interface BatchReentryResponse {
  success_count: number;
  failed_count: number;
  results: Array<{
    event_participant_id: number;
    squad_id: number;
    success: boolean;
    squad_participant_id?: number;
    round_entry_number?: number;
    error?: string;
  }>;
}

// Batch operation types for squad removals
export interface BatchRemovalItem {
  squad_id: number;
  squad_participant_id: number;
}

export interface BatchRemovalRequest {
  removals: BatchRemovalItem[];
}

export interface BatchRemovalResponse {
  success_count: number;
  failed_count: number;
  results: Array<{
    squad_id: number;
    squad_participant_id: number;
    success: boolean;
    error?: string;
  }>;
}

/** Team events: POST /squads/batch-team-operations */
export type BatchTeamSquadAction = 'assign' | 'remove';

export interface BatchTeamSquadOperation {
  action: BatchTeamSquadAction;
  team_id: number;
  squad_id: number;
}

export interface BatchTeamSquadRequest {
  operations: BatchTeamSquadOperation[];
}

export interface BatchTeamSquadResultRow {
  action: BatchTeamSquadAction;
  team_id: number;
  squad_id: number;
  success: boolean;
  error?: string;
}

export interface BatchTeamSquadResponse {
  success_count: number;
  failed_count: number;
  results: BatchTeamSquadResultRow[];
}

// Round participants data for fetching all participants under a round
export interface RoundParticipantData {
  squad_id: number;
  squad_name: string;
  participants: SquadParticipantWithUser[];
}

export interface RoundParticipantsResponse {
  round_id: number;
  round_name: string;
  squads: RoundParticipantData[];
}

/** One squad's teams under GET /squads/round/{round_id}/teams */
export interface RoundSquadTeamsData {
  squad_id: number;
  squad_name: string;
  teams: EventTeamWithMembers[];
}

export interface RoundTeamsResponse {
  round_id: number;
  round_name: string;
  squads: RoundSquadTeamsData[];
}

export interface RoundScoringRosterParticipant {
  squad_id: number;
  squad_name: string;
  squad_locked_in: boolean;
  can_edit: boolean;
  event_participant_id?: number | null;
  user_id?: number | null;
  team_id?: number | null;
  user_name?: string | null;
  team_name?: string | null;
  display_name: string;
  qualifying_average?: number | null;
  handicap?: number | null;
  entry_number?: number | null;
  team_members?: Array<{
    event_participant_id?: number | null;
    team_member_id?: number | null;
    user_id?: number | null;
    display_name?: string | null;
  }>;
}

export interface RoundScoringRosterResponse {
  round_id: number;
  round_name: string;
  participants: RoundScoringRosterParticipant[];
}