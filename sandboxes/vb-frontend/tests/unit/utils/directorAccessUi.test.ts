import { describe, expect, it } from 'vitest';

import { mapDirectorAccessToUiFlags } from '@/utils/directorAccessUi';

describe('mapDirectorAccessToUiFlags', () => {
  it('grants all flags for admin regardless of access payload', () => {
    const flags = mapDirectorAccessToUiFlags(undefined, true);
    expect(flags).toEqual({
      canEditEventInfo: true,
      canEditEventFormat: true,
      canParticipants: true,
      canSquads: true,
      canLanes: true,
      canGameScoring: true,
      canManageDelegation: true,
    });
  });

  it('ORs tournament and event capabilities from API payload', () => {
    const flags = mapDirectorAccessToUiFlags(
      {
        can_manage_event_info: true,
        can_manage_event_format: false,
        can_manage_participants: false,
        can_manage_squads: true,
        can_manage_lanes: false,
        can_manage_game_scoring: false,
        from_tournament_event_info: true,
        from_tournament_event_format: false,
        from_tournament_participants: false,
        from_tournament_squads: false,
        from_tournament_lanes: false,
        from_tournament_game_scoring: false,
        from_event_event_info: false,
        from_event_event_format: false,
        from_event_participants: false,
        from_event_squads: true,
        from_event_lanes: false,
        from_event_game_scoring: false,
        is_tournament_organizer_or_co_owner: false,
        can_create_events_in_tournament: false,
      },
      false
    );
    expect(flags.canEditEventInfo).toBe(true);
    expect(flags.canEditEventFormat).toBe(false);
    expect(flags.canSquads).toBe(true);
    expect(flags.canLanes).toBe(false);
    expect(flags.canGameScoring).toBe(false);
    expect(flags.canManageDelegation).toBe(false);
  });

  it('maps lanes and scoring independently from squads', () => {
    const flags = mapDirectorAccessToUiFlags(
      {
        can_manage_event_info: false,
        can_manage_event_format: false,
        can_manage_participants: false,
        can_manage_squads: false,
        can_manage_lanes: true,
        can_manage_game_scoring: true,
        from_tournament_event_info: false,
        from_tournament_event_format: false,
        from_tournament_participants: false,
        from_tournament_squads: false,
        from_tournament_lanes: true,
        from_tournament_game_scoring: true,
        from_event_event_info: false,
        from_event_event_format: false,
        from_event_participants: false,
        from_event_squads: false,
        from_event_lanes: false,
        from_event_game_scoring: false,
        is_tournament_organizer_or_co_owner: false,
        can_create_events_in_tournament: false,
      },
      false
    );
    expect(flags.canSquads).toBe(false);
    expect(flags.canLanes).toBe(true);
    expect(flags.canGameScoring).toBe(true);
  });

  it('keeps format controls available even when event-info edit is denied', () => {
    const flags = mapDirectorAccessToUiFlags(
      {
        can_manage_event_info: false,
        can_manage_event_format: true,
        can_manage_participants: false,
        can_manage_squads: false,
        can_manage_lanes: false,
        can_manage_game_scoring: false,
        from_tournament_event_info: false,
        from_tournament_event_format: true,
        from_tournament_participants: false,
        from_tournament_squads: false,
        from_tournament_lanes: false,
        from_tournament_game_scoring: false,
        from_event_event_info: false,
        from_event_event_format: false,
        from_event_participants: false,
        from_event_squads: false,
        from_event_lanes: false,
        from_event_game_scoring: false,
        is_tournament_organizer_or_co_owner: false,
        can_create_events_in_tournament: false,
      },
      false
    );
    expect(flags.canEditEventInfo).toBe(false);
    expect(flags.canEditEventFormat).toBe(true);
  });
});
