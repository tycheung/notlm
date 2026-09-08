import { UserRead } from './user';

export interface EventParticipantBase {
  event_id: number;
  user_id: number;
  status: string; // pending, approved, withdrawn
  entry_number: number; // 1 = first entry, >1 = re-entries
  entry_fee_paid: boolean;
  payment_status: boolean;
  paid_amount?: number | null;
  payment_date?: string | null; // ISO format datetime
  payment_method?: string | null;
  payment_notes?: string | null;
  checked_in: boolean;
  checked_in_at?: string | null; // ISO format datetime
  notes?: string | null;
  
  // Team support
  team_id?: number | null;
  team_member_id?: number | null;
}

export interface EventParticipantRead extends EventParticipantBase {
  id: number;
  registered_at: string; // ISO format datetime
  approval_date?: string | null; // ISO format datetime
  approved_by?: number | null;
  rejection_reason?: string | null;
  qualifying_average?: number;
  handicap?: number | null;
  duplicate_entry?: boolean;
  duplicate_entry_count?: number;
  is_youth?: boolean;
  is_senior?: boolean;
}

export interface EventParticipantCreate extends EventParticipantBase {
  // No additional fields
}

export interface EventParticipantUpdate {
  status?: string;
  entry_fee_paid?: boolean;
  payment_status?: boolean;
  paid_amount?: number | null;
  payment_date?: string | null;
  payment_method?: string | null;
  payment_notes?: string | null;
  checked_in?: boolean;
  checked_in_at?: string | null;
  notes?: string | null;
  qualifying_average?: number;
  handicap?: number | null;
  is_youth?: boolean;
  is_senior?: boolean;
  
  // Team support
  team_id?: number | null;
  team_member_id?: number | null;
}

export interface EventParticipantWithUser extends EventParticipantRead {
  user_name: string;
  user_email?: string | null;
  user_usbc_id?: string;
  /** True when USBC is server-issued placeholder (V + 12 hex) */
  user_usbc_is_placeholder?: boolean;
  user_is_verified?: boolean;
  user_average_lifetime_score?: number | null;
  user_average_365day_score?: number | null;
  user_average_90day_score?: number | null;
  user_average_50games_score?: number | null;
  user_gender?: 'male' | 'female' | 'other' | null;
  user_birth_date?: string | null;
  is_youth?: boolean;
  is_senior?: boolean;
  /** Team events: profile age 21 or under as of event start (TD review; not auto Youth). */
  youth_eligibility_review?: boolean;
  
  // Re-entry information
  is_reentry?: boolean;
  round_entry_number?: number;
  squadParticipantId?: number; // For re-entries, the specific squad participant ID
  
  // Team information
  team_id?: number | null;
  team_member_id?: number | null;
  team_name?: string | null;
  team_number?: number | null;
  team_display_name?: string | null;
  is_team_captain?: boolean | null;
  team_position?: number | null;
  team_member_count?: number | null;
  team_members_paid?: number | null;
  team_members_checked_in?: number | null;
  team_average?: number | null;
  team_is_valid?: boolean | null;
  duplicate_entry?: boolean;
  duplicate_entry_count?: number;
}

export interface EventRegistrationStats {
  event_id: number;
  event_name: string;
  total_registrations: number;
  pending_count: number;
  approved_count: number;
  withdrawn_count: number;
  total_paid: number;
  total_checked_in: number;
  reentry_count: number;
}

export interface HistoricalQualifyingAverage {
  id: number;
  user_id: number;
  event_id: number;
  tournament_id: number;
  bowling_center_id: number;
  qualifying_average: number;
  used_date: string;
  event_name?: string;
  tournament_name?: string;
  tournament_date?: string;
  bowling_center_name?: string;
}

/** POST /events/{event_id}/participants/batch-unassign-all */
export interface BatchUnassignAllRequest {
  event_participant_ids: number[];
}

export interface BatchUnassignAllResultRow {
  event_participant_id: number;
  success: boolean;
  error?: string;
}

export interface BatchUnassignAllResponse {
  success_count: number;
  failed_count: number;
  results: BatchUnassignAllResultRow[];
}

/** POST /events/{event_id}/participants/check-in-all */
export interface CheckInAllResponse {
  checked_in_count: number;
}