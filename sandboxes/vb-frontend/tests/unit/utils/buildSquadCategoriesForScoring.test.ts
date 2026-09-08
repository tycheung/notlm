import { describe, expect, it } from 'vitest';
import { buildSquadCategoriesForScoring } from '../../../src/utils/eventRound/buildSquadCategoriesForScoring';

describe('buildSquadCategoriesForScoring', () => {
  it('builds unassigned + squad categories for individual events', () => {
    const categories = buildSquadCategoriesForScoring({
      isTeamEvent: false,
      squads: [{ id: 3, name: 'Squad A' } as any],
      unassignedParticipants: [{ id: 10, user_id: 1 } as any],
      unassignedTeams: [],
      squadParticipants: {
        3: [
          {
            id: 100,
            event_participant_id: 11,
            is_reentry: false,
            round_entry_number: 1,
          },
        ],
      },
      squadTeamsData: {},
      pendingAssignmentChanges: {},
      pendingTeamAssignmentChanges: {},
    });

    expect(categories).toHaveLength(2);
    expect(categories[0]).toMatchObject({ id: 'unassigned', name: 'Unassigned' });
    expect(categories[0].participants).toHaveLength(1);
    expect(categories[1]).toMatchObject({ id: '3', name: 'Squad A' });
    expect(categories[1].participants).toHaveLength(1);
    expect((categories[1].participants[0] as any).squadParticipantId).toBe(100);
  });

  it('includes pending assignments and drops pending removals for individuals', () => {
    const categories = buildSquadCategoriesForScoring({
      isTeamEvent: false,
      squads: [{ id: 3, name: 'Squad A' } as any],
      unassignedParticipants: [],
      unassignedTeams: [],
      squadParticipants: {
        3: [{ id: 100, event_participant_id: 11, is_reentry: false }],
      },
      squadTeamsData: {},
      pendingAssignmentChanges: {
        add: {
          toSquadId: '3',
          fromSquadId: 'unassigned',
          participant: { id: 12, user_id: 2 },
          isRemoval: false,
        },
        remove: {
          toSquadId: 'unassigned',
          fromSquadId: '3',
          participant: { id: 11, user_id: 1 },
          isRemoval: false,
          is_reentry: false,
        },
      },
      pendingTeamAssignmentChanges: {},
    });

    const squadParticipants = categories.find((c) => c.id === '3')?.participants ?? [];
    const ids = squadParticipants.map((p: any) => p.id);
    expect(ids).toContain(12);
    expect(ids).not.toContain(11);
  });

  it('builds team event categories from squadTeamsData', () => {
    const categories = buildSquadCategoriesForScoring({
      isTeamEvent: true,
      squads: [{ id: 5, name: 'Team Squad' } as any],
      unassignedParticipants: [],
      unassignedTeams: [{ id: 1, team_name: 'Free Agents' } as any],
      squadParticipants: {},
      squadTeamsData: {
        5: [{ id: 9, team_name: 'Aces', team_number: 1 } as any],
      },
      pendingAssignmentChanges: {},
      pendingTeamAssignmentChanges: {},
    });

    expect(categories[0].participants).toHaveLength(1);
    expect(categories[1].participants).toHaveLength(1);
    expect((categories[1].participants[0] as any).name).toBe('Aces');
  });
});
