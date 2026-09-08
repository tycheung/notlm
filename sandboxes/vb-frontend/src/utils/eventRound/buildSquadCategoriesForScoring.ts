import type { EventParticipantWithUser } from '../../types/event_participant';
import type { EventTeamWithMembers } from '../../types/event_team';
import type { SquadRead } from '../../types/squad';

export interface SquadCategory {
  id: string;
  name: string;
  /** Individual participants or teams depending on event type */
  participants: unknown[];
}

export interface BuildSquadCategoriesInput {
  isTeamEvent: boolean;
  squads: SquadRead[];
  unassignedParticipants: EventParticipantWithUser[];
  unassignedTeams: EventTeamWithMembers[];
  squadParticipants: Record<number, unknown[]>;
  squadTeamsData: Record<number, EventTeamWithMembers[]>;
  pendingAssignmentChanges: Record<string, any>;
  pendingTeamAssignmentChanges: Record<string, any>;
}

/**
 * Build squad category rows for scoring/assignment tables (verbatim EventRoundWorkspace logic).
 */
export function buildSquadCategoriesForScoring(
  input: BuildSquadCategoriesInput
): SquadCategory[] {
  const {
    isTeamEvent,
    squads,
    unassignedParticipants,
    unassignedTeams,
    squadParticipants,
    squadTeamsData,
    pendingAssignmentChanges,
    pendingTeamAssignmentChanges,
  } = input;

  const categories: SquadCategory[] = [];

  if (isTeamEvent) {
    categories.push({
      id: 'unassigned',
      name: 'Unassigned',
      participants: unassignedTeams || [],
    });

    (squads || []).forEach((squad) => {
      const squadTeamsList = squadTeamsData?.[squad.id] || [];

      const currentTeams = squadTeamsList.map((team) => ({
        ...team,
        id: team.id,
        team_name: team.team_name || team.display_name || `Team ${team.team_number}`,
        name: team.team_name || team.display_name || `Team ${team.team_number}`,
        is_reentry: team.is_reentry || false,
        entry_number: team.entry_number || 1,
      }));

      const pendingTeams = Object.values(pendingTeamAssignmentChanges || {})
        .filter((change) => change != null && change.toSquadId === squad.id.toString())
        .map((change) => change.team)
        .filter((team) => team != null && team.id != null);

      const allTeams = [...currentTeams];

      pendingTeams.forEach((pendingTeam) => {
        if (!pendingTeam || !pendingTeam.id) return;
        const isAlreadyIncluded = allTeams.some((t) => t && t.id === pendingTeam.id);
        if (!isAlreadyIncluded) {
          allTeams.push({
            ...pendingTeam,
            team_name:
              pendingTeam.team_name ||
              pendingTeam.display_name ||
              `Team ${pendingTeam.team_number}`,
            name:
              pendingTeam.team_name ||
              pendingTeam.display_name ||
              `Team ${pendingTeam.team_number}`,
            is_reentry: pendingTeam.is_reentry || false,
            entry_number: pendingTeam.entry_number || 1,
          });
        }
      });

      const teamsToRemove = Object.values(pendingTeamAssignmentChanges || {})
        .filter(
          (change) =>
            change != null &&
            change.fromSquadId === squad.id.toString() &&
            change.toSquadId !== squad.id.toString() &&
            !change.isRemoval
        )
        .map((change) => change.team?.id)
        .filter((id) => id != null) as number[];

      const finalTeams = allTeams.filter((team) => {
        if (!team || !team.id) return false;
        return !teamsToRemove.includes(team.id);
      });

      categories.push({
        id: squad.id.toString(),
        name: squad.name,
        participants: finalTeams,
      });
    });
  } else {
    categories.push({
      id: 'unassigned',
      name: 'Unassigned',
      participants: unassignedParticipants || [],
    });

    (squads || []).forEach((squad) => {
      const squadParticipantsList = (squadParticipants?.[squad.id] || []) as any[];

      const currentParticipants = squadParticipantsList.map((squadParticipant) => ({
        ...squadParticipant,
        id: squadParticipant.event_participant_id || squadParticipant.id || Date.now(),
        squadParticipantId: squadParticipant.id || Date.now(),
        is_reentry: squadParticipant.is_reentry || false,
        round_entry_number: squadParticipant.round_entry_number || 1,
      }));

      const pendingParticipants = Object.values(pendingAssignmentChanges)
        .filter((change) => change != null && change.toSquadId === squad.id.toString())
        .map((change) => change.participant)
        .filter(
          (participant) => participant != null && participant.id != null
        ) as EventParticipantWithUser[];

      const allParticipants = [...currentParticipants];

      pendingParticipants.forEach((pendingParticipant) => {
        if (!pendingParticipant || !pendingParticipant.id) return;
        const isAlreadyIncluded = allParticipants.some(
          (p) => p && p.id === pendingParticipant.id
        );
        if (!isAlreadyIncluded) {
          allParticipants.push({
            ...pendingParticipant,
            is_pool_participant: (pendingParticipant as any).is_pool_participant || false,
            pool_entry_id: (pendingParticipant as any).pool_entry_id || undefined,
            is_reentry: pendingParticipant.is_reentry || false,
            round_entry_number: pendingParticipant.round_entry_number || undefined,
          });
        }
      });

      const participantsToRemove = Object.values(pendingAssignmentChanges)
        .filter(
          (change) =>
            change != null &&
            change.fromSquadId === squad.id.toString() &&
            change.toSquadId !== squad.id.toString() &&
            !change.isRemoval
        )
        .map((change) => {
          if (change.is_reentry && change.squadParticipantId) {
            return change.squadParticipantId;
          }
          return change.participant?.id;
        })
        .filter((id) => id != null) as number[];

      const finalParticipants = allParticipants.filter((participant) => {
        if (!participant || !participant.id) return false;
        if (participant.is_reentry && participant.squadParticipantId) {
          return !participantsToRemove.includes(participant.squadParticipantId);
        }
        return !participantsToRemove.includes(participant.id);
      });

      categories.push({
        id: squad.id.toString(),
        name: squad.name,
        participants: finalParticipants,
      });
    });
  }

  return categories;
}
