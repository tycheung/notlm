export interface EventDirectorAccess {
  can_manage_event_info: boolean;
  can_manage_event_format: boolean;
  can_manage_participants: boolean;
  can_manage_squads: boolean;
  can_manage_lanes: boolean;
  can_manage_game_scoring: boolean;
  from_tournament_event_info: boolean;
  from_tournament_event_format: boolean;
  from_tournament_participants: boolean;
  from_tournament_squads: boolean;
  from_tournament_lanes: boolean;
  from_tournament_game_scoring: boolean;
  from_event_event_info: boolean;
  from_event_event_format: boolean;
  from_event_participants: boolean;
  from_event_squads: boolean;
  from_event_lanes: boolean;
  from_event_game_scoring: boolean;
  is_tournament_organizer_or_co_owner: boolean;
  can_create_events_in_tournament: boolean;
}

export interface TDSearchUser {
  id: number;
  first_name: string;
  last_name: string;
  display_name?: string | null;
  email?: string | null;
  usbc_id?: string | null;
  phone?: string | null;
  state?: string | null;
}

export interface EventDirectorDelegationRead {
  id: number;
  event_id: number;
  delegate_user_id: number;
  can_manage_event_info: boolean;
  can_manage_event_format: boolean;
  can_manage_participants: boolean;
  can_manage_squads: boolean;
  can_manage_lanes: boolean;
  can_manage_game_scoring: boolean;
}

export interface EventDirectorDelegationUpsert {
  delegate_user_id: number;
  can_manage_event_info: boolean;
  can_manage_event_format: boolean;
  can_manage_participants: boolean;
  can_manage_squads: boolean;
  can_manage_lanes: boolean;
  can_manage_game_scoring: boolean;
}

export interface TournamentDirectorPermissionRead {
  id: number;
  tournament_id: number;
  delegate_user_id: number;
  is_tournament_co_owner: boolean;
  can_create_events: boolean;
  can_manage_event_info: boolean;
  can_manage_event_format: boolean;
  can_manage_participants: boolean;
  can_manage_squads: boolean;
  can_manage_lanes: boolean;
  can_manage_game_scoring: boolean;
}

export interface TournamentDirectorPermissionUpsert {
  delegate_user_id: number;
  is_tournament_co_owner: boolean;
  can_create_events: boolean;
  can_manage_event_info: boolean;
  can_manage_event_format: boolean;
  can_manage_participants: boolean;
  can_manage_squads: boolean;
  can_manage_lanes: boolean;
  can_manage_game_scoring: boolean;
}

/** Current user's tournament-level capabilities (from GET .../tournaments/:id/my-access). */
export interface MyTournamentDirectorAccess {
  is_tournament_master: boolean;
  can_create_events: boolean;
}
