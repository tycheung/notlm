import { UserRead } from './user';

export interface EventTeamBase {
  event_id: number;
  team_name?: string | null;
  team_number: number;
  entry_number: number;
  parent_team_id?: number | null;
}

export interface EventTeamCreate {
  event_id: number;
  team_name?: string | null;
  members: number[]; // List of user IDs
  captain_user_id?: number | null;
  entry_number: number;
  parent_team_id?: number | null;
}

export interface EventTeamUpdate {
  team_name?: string | null;
}

export interface EventTeamRead extends EventTeamBase {
  id: number;
  registered_at: string; // ISO datetime
  registered_by: number;
  display_name: string;
  is_reentry: boolean;
  created_at: string; // ISO datetime
  updated_at?: string | null; // ISO datetime
}

export interface EventTeamMemberManagement {
  user_id: number;
  is_captain: boolean;
  position?: number | null;
}

export interface EventTeamAddMembers {
  members: EventTeamMemberManagement[];
}

export interface EventTeamWithMembers extends EventTeamRead {
  members: EventTeamMemberWithUser[];
  registrar_name: string;
  member_count: number;
  expected_team_size?: number | null;
  is_roster_complete: boolean;
}

export interface EventTeamFull extends EventTeamWithMembers {
  event?: EventRead | null;
  registrar?: UserRead | null;
  parent_team?: EventTeamRead | null;
  reentries: EventTeamRead[];
}

export interface EventTeamRegistration extends EventTeamCreate {
  auto_approve: boolean;
  auto_pay: boolean;
  notes?: string | null;
}

export interface PublicTeamMemberRow {
  first_name: string;
  last_name: string;
  usbc_id?: string | null;
  is_captain: boolean;
}

export interface PublicTeamSignUp {
  team_name: string;
  members: PublicTeamMemberRow[];
  entry_number?: number;
}

export interface EventTeamReentry {
  original_team_id: number;
  team_name?: string | null;
  include_all_members: boolean;
  member_user_ids?: number[] | null;
  captain_user_id?: number | null;
}

export interface EventTeamStats {
  team_id: number;
  team_name: string;
  member_count: number;
  members_paid: number;
  members_checked_in: number;
  team_average?: number | null;
  team_handicap?: number | null;
  total_paid?: number | null;
  payment_status: 'paid' | 'partial' | 'unpaid';
}

export interface EventTeamCaptainUpdate {
  new_captain_user_id: number;
}

export interface EventTeamMemberRemove {
  user_id: number;
  reason?: string | null;
}

// Team Member Types
export interface EventTeamMemberBase {
  team_id: number;
  user_id: number;
  is_captain: boolean;
  position: number;
}

export interface EventTeamMemberCreate extends EventTeamMemberBase {
  added_by?: number | null;
}

export interface EventTeamMemberUpdate {
  is_captain?: boolean | null;
  position?: number | null;
}

export interface EventTeamMemberRead extends EventTeamMemberBase {
  id: number;
  joined_at: string; // ISO datetime
  added_by: number;
  created_at: string; // ISO datetime
  updated_at?: string | null; // ISO datetime
}

export interface EventTeamMemberWithUser extends EventTeamMemberRead {
  /** EventParticipant.id — use for games/scoring; id above is EventTeamMember.id */
  event_participant_id?: number | null;
  user_name: string;
  user_email?: string | null;
  user_usbc_id?: string | null;
  user_average_lifetime_score?: number | null;
  user_average_365day_score?: number | null;
  user_average_90day_score?: number | null;
  user_average_50games_score?: number | null;
  qualifying_average?: number | null;
  handicap?: number | null;
  added_by_name: string;
}

export interface EventTeamMemberFull extends EventTeamMemberWithUser {
  team?: EventTeamRead | null;
  user?: UserRead | null;
  added_by_user?: UserRead | null;
  participant?: EventParticipantRead | null;
}

// Batch team creation types
export interface TeamMemberCreate {
  usbc_id: string;
  first_name: string;
  last_name: string;
  user_id?: number | null;
  is_existing: boolean;
  qualifying_average?: number | null;
  /** True = captain; omit or null = unspecified (backend picks randomly if ambiguous). */
  is_team_captain?: boolean | null;
}

export interface BatchTeamEntry {
  team_name?: string | null;
  members: TeamMemberCreate[];
}

export interface BatchTeamCreate {
  event_id: number;
  team_size: number;
  teams: BatchTeamEntry[];
}

export interface BatchTeamCreateResponse {
  created_teams: EventTeamWithMembers[];
  created_users: UserRead[];
  total_teams: number;
  total_members: number;
}

// Forward reference imports (will be resolved by TypeScript)
import type { EventRead } from './event';
import type { EventParticipantRead } from './event_participant';