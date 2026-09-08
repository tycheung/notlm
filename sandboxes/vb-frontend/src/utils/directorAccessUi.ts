import type { EventDirectorAccess } from '../types/director_delegation';

/** Maps API director access + admin to UI edit flags (same rules as EventDetails). */
export function mapDirectorAccessToUiFlags(
  access: EventDirectorAccess | undefined,
  isAdmin: boolean
) {
  return {
    canEditEventInfo: isAdmin || !!access?.can_manage_event_info,
    canEditEventFormat: isAdmin || !!access?.can_manage_event_format,
    canParticipants: isAdmin || !!access?.can_manage_participants,
    canSquads: isAdmin || !!access?.can_manage_squads,
    canLanes: isAdmin || !!access?.can_manage_lanes,
    canGameScoring: isAdmin || !!access?.can_manage_game_scoring,
    canManageDelegation: isAdmin || !!access?.is_tournament_organizer_or_co_owner,
  };
}
