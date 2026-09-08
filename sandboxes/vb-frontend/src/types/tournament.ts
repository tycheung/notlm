import { RoundRead } from './round';
import { BowlingCenterRead } from './bowling_center';
import { EventRead } from './event';

export enum RegistrationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  WITHDRAWN = 'withdrawn'
}

export interface Participant {
  id: number;
  name: string;
  email: string;
}

export interface TournamentBase {
  name: string;
  /** Derived from events; may be null until events exist */
  start_date: string | null;
  end_date: string | null;
  official_flg: boolean; // Always set to false in the application
  bowling_center_id: number;
  description?: string | null;
  rules?: string | null;
  organizer_id?: number | null;
  location: string; // Required location field
  registration_deadline?: string | null; // ISO format date for registration cutoff
  lanes_reserved: number;
  lane_management_settings?: LaneManagementSettings;
}

export interface LaneManagementSettings {
  rotation_enabled: boolean;
  rotation_interval_games: number;
  auto_assign_lanes: boolean;
  conflict_mode_defaults?: {
    cross_event_only: boolean;
    overlap_time_only: boolean;
    include_reentry: boolean;
    min_occurrences: number;
  };
}

export interface LaneConflictOccurrence {
  event_id: number;
  event_name: string;
  round_id: number;
  round_number: number;
  squad_id: number | null;
  squad_name: string | null;
  squad_start: string | null;
  assigned_lane: number;
  game_number?: number | null;
  source?: 'stamp' | 'home' | string;
  is_reentry: boolean;
}

export interface LaneConflictRow {
  user_id: number | null;
  team_id?: number | null;
  subject_kind?: 'user' | 'team' | string;
  subject_id?: number;
  display_name: string;
  pair_low: number;
  pair_high: number;
  occurrence_count: number;
  severity: 'warning' | 'high';
  occurrences: LaneConflictOccurrence[];
}

export interface TournamentLaneConflictReport {
  rows: LaneConflictRow[];
  meta: {
    events_with_overrides: Array<{ event_id: number; event_name: string }>;
  };
}

export interface TournamentCreate extends TournamentBase {
  location: string;
  sa_only?: boolean;
  sa_game_count?: number;
  sa_event_format?: 'singles' | 'teams';
  sa_team_size?: number | null;
}

export interface TournamentUpdate {
  name?: string;
  start_date?: string;
  end_date?: string;
  official_flg?: boolean; // Always set to false in the application
  bowling_center_id?: number;
  description?: string | null;
  rules?: string | null;
  is_active?: boolean;
  organizer_id?: number | null;
  location?: string;
  registration_deadline?: string | null;
  lanes_reserved?: number;
}

export interface TournamentCopyRequest {
  name: string;
  include_roster: boolean;
  event_dates?: Record<number, { start_date: string; end_date: string }>;
}

export interface TournamentCopyResponse {
  tournament_id: number;
  first_event_id?: number | null;
  event_ids: number[];
}

export interface TournamentRead extends TournamentBase {
  id: number;
  created_at: string; // ISO format datetime
  updated_at?: string | null; // ISO format datetime
  is_active: boolean;
  current_entries?: number;
  total_registrations?: number;
  pending_registrations?: number;
  organizer_name?: string | null;
  bowling_center_name?: string | null;
  is_sa_only?: boolean;
  sa_only_event_id?: number | null;
  unique_participant_cap?: number;
  max_assistants?: number | null;
}

export interface TournamentWithEvents extends TournamentRead {
  events: EventRead[];
}

export interface TournamentWithCenter extends TournamentRead {
  bowling_center: BowlingCenterRead;
}

export interface TournamentStats {
  tournament_id: number;
  tournament_name: string;
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

export interface TournamentSearch {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  bowling_center_name: string;
  city: string;
  state: string;
  current_entries: number;
  status: string; // 'upcoming', 'ongoing', 'completed'
  distance?: number | null; // Distance in miles from user location
  events_count: number;
  lanes_reserved?: number;
}

export interface TournamentRegistration {
  tournament_id: number;
  user_id: number;
  entry_fee_paid: boolean;
  registration_date?: string | null; // ISO format datetime
  notes?: string | null;
  status?: RegistrationStatus | string;
  approval_date?: string | null;
  approved_by?: number | null;
  rejection_reason?: string | null;
  selected_events?: number[]; // IDs of events the participant is registering for
}

export interface ParticipantWithUser {
  tournament_id: number;
  user_id: number;
  status: RegistrationStatus;
  registered_at: string;
  approval_date?: string | null;
  approved_by?: number | null;
  rejection_reason?: string | null;
  payment_status: boolean;
  paid_amount?: number | null;
  payment_date?: string | null;
  payment_method?: string | null;
  payment_notes?: string | null;
  checked_in: boolean;
  checked_in_at?: string | null;
  notes?: string | null;
  selected_events?: EventRead[]; // Events the participant has registered for
  user_name: string;
  user_email?: string | null;
  user_usbc_id?: string;
  user_is_verified?: boolean;
  user_average_lifetime_score?: number | null;
  user_average_365day_score?: number | null;
  user_average_90day_score?: number | null;
  user_average_50games_score?: number | null;
}

export interface RegistrationStats {
  total_registrations: number;
  pending_count: number;
  approved_count: number;
  withdrawn_count: number;
  total_paid: number;
  total_checked_in: number;
}