import { EventParticipantWithUser } from '../types/event';
import { EventTeamWithMembers } from '../types/event_team';
import type { EventTeamWithPoolMeta } from '../utils/advancementPoolTeams';
import { SquadRead } from '../types/squad';
import { GameRead } from '../types/game';
import { DragDropCategory, DragDropItem } from '../components/common/DragDropCategorizedTable';
import { normalizeSquadCategoryId } from '../hooks/useAssignmentChanges';

interface SquadCategory {
  id: string;
  name: string;
  participants: EventParticipantWithUser[];
  maxParticipants?: number;
}

export interface PendingAssignmentChange {
  fromSquadId: string | null;
  toSquadId: string | null;
  participant: EventParticipantWithUser;
  is_reentry: boolean;
  originalId?: number;
  isRemoval?: boolean;
  squadParticipantId?: number;
  isPoolParticipant?: boolean;
  poolEntryId?: number;
}

export interface PendingTeamAssignmentChanges {
  [teamId: number]: {
    fromSquadId: string | null;
    toSquadId: string | null;
    team: EventTeamWithMembers;
    is_reentry: boolean;
    originalId?: number;
    isRemoval?: boolean;
  };
}

export interface PendingAssignmentChanges {
  [key: number]: PendingAssignmentChange;
}

export class AssignmentService {
  // Create drag and drop categories for the assignment interface
  static createDragDropCategories(
    unassignedParticipants: EventParticipantWithUser[],
    squads: SquadRead[],
    squadParticipants: { [squadId: number]: any[] },
    pendingAssignmentChanges: PendingAssignmentChanges,
    allPoolParticipants?: any[]
  ): DragDropCategory[] {
    
    const categories: DragDropCategory[] = [];
    const poolByParticipantId = new Map<number, any>();
    (allPoolParticipants || []).forEach((pool: any) => {
      const id = Number(pool?.event_participant_id);
      if (Number.isFinite(id)) poolByParticipantId.set(id, pool);
    });
    
    // Unassigned category
    // Include original unassigned participants
    const originalUnassignedItems: DragDropItem[] = (unassignedParticipants || [])
      .filter(participant => participant != null && participant.id != null)
      .map(participant => ({
        id: participant!.id,
        data: participant!
      }));
    
    // Add participants that have pending changes to move to unassigned
    // but only if they're not already in the original unassigned list
    const incomingUnassignedParticipants = Object.values(pendingAssignmentChanges)
      .filter(change => change.toSquadId === null) // null means unassigned
      .filter(change => !unassignedParticipants?.some(p => p.id === change.participant.id)) // avoid duplicates
      .map(change => change.participant);
    
    // Remove participants that are being moved FROM unassigned TO squads
    const participantsMovingFromUnassigned = Object.values(pendingAssignmentChanges)
      .filter(change => change.fromSquadId === null && change.toSquadId !== null) // from unassigned to squad
      .map(change => change.participant.id);
    
    const filteredOriginalUnassignedItems = originalUnassignedItems.filter(
      item => !participantsMovingFromUnassigned.includes(item.id)
    );
    
    const allUnassignedItems = [
      ...filteredOriginalUnassignedItems,
      ...incomingUnassignedParticipants.map(participant => ({
        id: participant.id,
        data: participant
      }))
    ];
    
    categories.push({
      id: 'unassigned',
      name: 'Unassigned',
      items: allUnassignedItems
    });
    
    // Squad categories
    squads.forEach(squad => {
      const squadParticipantsList = squadParticipants[squad.id] || [];
      
      // Get participants currently assigned to this squad (from backend)
      const currentParticipants = squadParticipantsList
        .filter(squadParticipant => squadParticipant != null && squadParticipant.event_participant_id != null)
        .map(squadParticipant => {
          // Check if this participant is a pool participant by looking in allPoolParticipants
          const poolParticipant = poolByParticipantId.get(
            Number(squadParticipant.event_participant_id)
          );
          
          return {
            id: squadParticipant.event_participant_id,
            user_name: squadParticipant.user_name,
            user_email: squadParticipant.user_email,
            user_id: squadParticipant.user_id,
            status: 'approved',
            // Include re-entry information from squad participant data
            is_reentry: squadParticipant.is_reentry,
            round_entry_number: squadParticipant.round_entry_number,
            // Include squad_participant_id for granular tracking
            squadParticipantId: squadParticipant.id,
            // Include pool participant information if this is a pool participant
            is_pool_participant: !!poolParticipant,
            pool_entry_id: poolParticipant?.id || undefined,
            advancement_position: poolParticipant?.advancement_position || undefined,
            advancement_criteria_type: poolParticipant?.advancement_criteria_type || undefined,
            advancement_criteria_value: poolParticipant?.advancement_criteria_value || undefined,
            source_round_id: poolParticipant?.source_round_id || undefined,
            target_round_id: poolParticipant?.target_round_id || undefined,
            advancement_relationship_id: poolParticipant?.advancement_relationship_id || undefined,
            source_round_friendly_name: poolParticipant?.source_round?.friendly_name || undefined,
            source_round_number: poolParticipant?.source_round?.round_number || undefined
          } as EventParticipantWithUser & { 
            squadParticipantId?: number;
            is_pool_participant?: boolean;
            pool_entry_id?: number;
            advancement_position?: number;
            advancement_criteria_type?: string;
            advancement_criteria_value?: number;
            source_round_id?: number;
            target_round_id?: number;
            advancement_relationship_id?: number;
            source_round_friendly_name?: string;
            source_round_number?: number;
          };
        });
      
      // Get participants pending assignment to this squad
      const pendingParticipants = Object.values(pendingAssignmentChanges)
        .filter(change => change != null && change.toSquadId === squad.id.toString())
        .map(change => change.participant)
        .filter(participant => participant != null && participant.id != null) as (EventParticipantWithUser & { squadParticipantId?: number })[];
      
      
      // Combine current and pending participants, removing any that are pending removal
      const allParticipants: (EventParticipantWithUser & { squadParticipantId?: number })[] = [...currentParticipants];
      
      // Add pending participants (avoiding duplicates)
      pendingParticipants.forEach(pendingParticipant => {
        if (!pendingParticipant || !pendingParticipant.id) return;
        
        // For re-entries, we need to check by squad_participant_id, not event_participant_id
        // because re-entries are separate entities that can coexist with the original participant
        const isAlreadyIncluded = allParticipants.some(p => {
          if (pendingParticipant.is_reentry && pendingParticipant.squadParticipantId) {
            // For re-entries, check if this specific squad participant ID already exists
            return p.squadParticipantId === pendingParticipant.squadParticipantId;
          } else {
            // For regular participants, check by event participant ID
            return p.id === pendingParticipant.id;
          }
        });
        
        if (!isAlreadyIncluded) {
          
          // For pool participants and re-entries, ensure they have the proper data structure
          const participantToAdd = {
            ...pendingParticipant,
            // If this is a pool participant, ensure they have the pool data
            is_pool_participant: (pendingParticipant as any).is_pool_participant || false,
            pool_entry_id: (pendingParticipant as any).pool_entry_id || undefined,
            // Ensure re-entry flag is preserved
            is_reentry: pendingParticipant.is_reentry || false,
            round_entry_number: pendingParticipant.round_entry_number || undefined
          };
          
          
          allParticipants.push(participantToAdd);
        } else {
        }
      });
      
      // Remove participants that are pending removal from this squad
      // For re-entries, check by squad_participant_id; for regular entries, check by event_participant_id
      const participantsToRemove = Object.values(pendingAssignmentChanges)
        .filter(change => change != null && change.fromSquadId === squad.id.toString() && change.toSquadId !== squad.id.toString() && !change.isRemoval)
        .map(change => {
          if (change.is_reentry && change.squadParticipantId) {
            return change.squadParticipantId; // Use squad_participant_id for re-entries
          } else {
            return change.participant?.id; // Use event_participant_id for regular entries
          }
        })
        .filter(id => id != null) as number[];
      
      const finalParticipants = allParticipants.filter(participant => {
        if (!participant || !participant.id) return false;
        
        // For re-entries, check if this specific squad_participant_id is pending removal
        if (participant.is_reentry && participant.squadParticipantId) {
          return !participantsToRemove.includes(participant.squadParticipantId);
        } else {
          // For regular entries, check by event_participant_id
          return !participantsToRemove.includes(participant.id);
        }
      }) as (EventParticipantWithUser & { squadParticipantId?: number })[];
      
      const items: DragDropItem[] = finalParticipants
        .filter(participant => participant != null && participant.id != null)
        .map(participant => ({
          id: participant!.id,
          data: participant!
        }));
      
      categories.push({
        id: squad.id.toString(),
        name: squad.name,
        items,
        maxItems: squad.max_participants
      });
    });
    
    return categories;
  }

  // Create squad categories for the scoring interface
  static createSquadCategories(
    squads: SquadRead[],
    squadParticipants: { [squadId: number]: any[] },
    pendingAssignmentChanges: PendingAssignmentChanges
  ): SquadCategory[] {
    return squads.map(squad => {
      const squadParticipantsList = squadParticipants[squad.id] || [];
      
      // Filter out participants that have pending changes to move away from this squad
      const effectiveParticipants = squadParticipantsList.filter((sp: any) => {
        const participantId = sp.event_participant_id;
        const pendingChange = pendingAssignmentChanges[participantId];
        
        if (pendingChange && pendingChange.fromSquadId === squad.id.toString()) {
          // This participant is being moved away from this squad
          return false;
        }
        
        return true;
      });
      
      // Add participants that have pending changes to move to this squad
      const incomingParticipants = Object.values(pendingAssignmentChanges)
        .filter(change => change.toSquadId === squad.id.toString())
        .map(change => change.participant);
      
      const allSquadParticipants = [...effectiveParticipants, ...incomingParticipants];
      
      return {
        id: squad.id.toString(),
        name: squad.name,
        participants: allSquadParticipants,
        maxItems: squad.max_participants
      };
    });
  }

  // Check if all participants are assigned
  static areAllParticipantsAssigned(
    unassignedParticipants: EventParticipantWithUser[],
    pendingAssignmentChanges: PendingAssignmentChanges
  ): boolean {
    // Count participants moving to unassigned
    const movingToUnassigned = Object.values(pendingAssignmentChanges)
      .filter(change => change.toSquadId === null).length;
    
    // If there are unassigned participants or participants moving to unassigned, not all are assigned
    return unassignedParticipants.length === 0 && movingToUnassigned === 0;
  }

  // Check if all participants are assigned (simplified version for main component)
  static areAllParticipantsAssignedSimple(unassignedParticipants: EventParticipantWithUser[]): boolean {
    return unassignedParticipants?.length === 0;
  }

  // Get the current round's game count
  static getCurrentRoundGameCount(eventComplete: any, selectedRoundId: number | null, squads: SquadRead[]): number {
    if (!eventComplete?.rounds || !Array.isArray(eventComplete.rounds)) return 0;
    
    if (selectedRoundId) {
      const selectedRound = eventComplete.rounds.find((r: any) => r.id === selectedRoundId);
      return selectedRound?.game_count || 0;
    } else if (squads && squads.length > 0) {
      const firstSquad = squads[0];
      const round = eventComplete.rounds.find((r: any) => r.id === firstSquad.round_id);
      return round?.game_count || 0;
    }
    
    return 0;
  }

  // Get games for a specific participant
  // For re-entries, we need to filter by squad_participant_id to get the correct game shells
  static getParticipantGames(
    participantId: number,
    squadGames: GameRead[],
    squadParticipantId?: number
  ): GameRead[] {
    if (squadParticipantId) {
      // For re-entries, filter by squad_participant_id to get the specific game shells
      return squadGames.filter(game => game.squad_participant_id === squadParticipantId);
    } else {
      // For regular participants, filter by event_participant_id
      return squadGames.filter(game => game.event_participant_id === participantId);
    }
  }

  // Get advancement type label
  static getAdvancementTypeLabel(advancementCriteriaType: string): string {
    switch (advancementCriteriaType) {
      case 'highest_average':
        return 'Highest Average';
      case 'highest_game':
        return 'Highest Game';
      case 'highest_scratch_game':
        return 'Highest Scratch Game';
      case 'total_score':
        return 'Total Score';
      case 'total_pinfall':
        return 'Total Pinfall';
      case 'total_pinfall_with_bonus':
      case 'total_with_bonus':
        return 'Total Pinfall with Bonus Pins';
      case 'elimination_order':
        return 'Elimination Order';
      case 'match_winners':
        return 'Match winners (bracket / race-to)';
      default:
        return advancementCriteriaType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  // TEAM-BASED ASSIGNMENT METHODS

  // Create drag and drop categories for team-based assignment interface
  static createTeamDragDropCategories(
    unassignedTeams: EventTeamWithMembers[],
    squads: SquadRead[],
    squadTeams: { [squadId: number]: EventTeamWithMembers[] },
    pendingTeamAssignmentChanges: PendingTeamAssignmentChanges,
    /** Teams that appear in the advancement pool for this round (metadata + roster); used to label squad rows */
    allPoolTeams?: EventTeamWithPoolMeta[]
  ): DragDropCategory[] {
    const poolTeamById = new Map<number, EventTeamWithPoolMeta>();
    (allPoolTeams || []).forEach((team) => {
      if (team?.id != null) {
        poolTeamById.set(Number(team.id), team as EventTeamWithPoolMeta);
      }
    });

    const enrichTeam = (t: EventTeamWithMembers): EventTeamWithMembers => {
      const pool = poolTeamById.get(Number(t.id));
      if (pool && (pool as EventTeamWithPoolMeta).is_pool_team) {
        return { ...t, ...pool } as EventTeamWithMembers;
      }
      return t;
    };

    const categories: DragDropCategory[] = [];
    
    // Unassigned category
    // Include original unassigned teams
    const originalUnassignedItems: DragDropItem[] = (unassignedTeams || [])
      .filter(team => team != null && team.id != null)
      .map(team => ({
        id: team!.id,
        data: enrichTeam(team!)
      }));
    
    // Add teams that have pending changes to move to unassigned
    const incomingUnassignedTeams = Object.values(pendingTeamAssignmentChanges)
      .filter(change => normalizeSquadCategoryId(change.toSquadId) === null)
      .filter(change => !unassignedTeams?.some(t => t.id === change.team.id)) // avoid duplicates
      .map(change => enrichTeam(change.team));
    
    // Remove teams that are being moved FROM unassigned TO squads
    const teamsMovingFromUnassigned = Object.values(pendingTeamAssignmentChanges)
      .filter(
        change =>
          normalizeSquadCategoryId(change.fromSquadId) === null &&
          normalizeSquadCategoryId(change.toSquadId) !== null
      )
      .map(change => change.team.id);
    
    const filteredOriginalUnassignedItems = originalUnassignedItems.filter(
      item => !teamsMovingFromUnassigned.includes(item.id)
    );
    
    const allUnassignedItems = [
      ...filteredOriginalUnassignedItems,
      ...incomingUnassignedTeams.map(team => ({
        id: team.id,
        data: team
      }))
    ];
    
    categories.push({
      id: 'unassigned',
      name: 'Unassigned Teams',
      items: allUnassignedItems
    });
    
    // Squad categories
    squads.forEach(squad => {
      const squadTeamsList = squadTeams[squad.id] || [];
      
      // Get teams currently assigned to this squad (from backend), with pool metadata when applicable
      const currentTeams = squadTeamsList
        .filter(squadTeam => squadTeam != null && squadTeam.id != null)
        .map(squadTeam => enrichTeam(squadTeam));
      
      // Get teams pending assignment to this squad
      const pendingTeams = Object.values(pendingTeamAssignmentChanges)
        .filter(
          change =>
            change != null &&
            normalizeSquadCategoryId(change.toSquadId) === squad.id.toString()
        )
        .map(change => enrichTeam(change.team))
        .filter(team => team != null && team.id != null) as EventTeamWithMembers[];
      
      // Combine current and pending teams, removing any that are pending removal
      const allTeams: EventTeamWithMembers[] = [...currentTeams];
      
      // Add pending teams (avoiding duplicates)
      pendingTeams.forEach(pendingTeam => {
        if (!pendingTeam || !pendingTeam.id) return;
        
        const isAlreadyIncluded = allTeams.some(t => t.id === pendingTeam.id);
        
        if (!isAlreadyIncluded) {
          allTeams.push(pendingTeam);
        }
      });
      
      // Remove teams that are pending removal from this squad
      const teamsToRemove = Object.values(pendingTeamAssignmentChanges)
        .filter(change => {
          if (change == null) return false;
          const from = normalizeSquadCategoryId(change.fromSquadId);
          const to = normalizeSquadCategoryId(change.toSquadId);
          return (
            from === squad.id.toString() &&
            to !== squad.id.toString() &&
            !change.isRemoval
          );
        })
        .map(change => change.team.id)
        .filter(id => id != null) as number[];
      
      const finalTeams = allTeams.filter(team => !teamsToRemove.includes(team.id));
      
      const items: DragDropItem[] = finalTeams
        .filter(team => team != null && team.id != null)
        .map(team => ({
          id: team!.id,
          data: team!
        }));
      
      categories.push({
        id: squad.id.toString(),
        name: squad.name,
        items,
        maxItems: squad.max_participants ? Math.ceil(squad.max_participants / 4) : undefined // Rough estimate for team capacity
      });
    });
    
    return categories;
  }

  // Create squad categories for team-based scoring interface
  static createTeamSquadCategories(
    squads: SquadRead[],
    squadTeams: { [squadId: number]: EventTeamWithMembers[] },
    pendingTeamAssignmentChanges: PendingTeamAssignmentChanges
  ): { id: string; name: string; teams: EventTeamWithMembers[]; maxTeams?: number }[] {
    return squads.map(squad => {
      const squadTeamsList = squadTeams[squad.id] || [];
      
      // Filter out teams that have pending changes to move away from this squad
      const effectiveTeams = squadTeamsList.filter((st: EventTeamWithMembers) => {
        const teamId = st.id;
        const pendingChange = pendingTeamAssignmentChanges[teamId];
        
        if (
          pendingChange &&
          normalizeSquadCategoryId(pendingChange.fromSquadId) === squad.id.toString()
        ) {
          // This team is being moved away from this squad
          return false;
        }
        
        return true;
      });
      
      // Add teams that have pending changes to move to this squad
      const incomingTeams = Object.values(pendingTeamAssignmentChanges)
        .filter(
          change => normalizeSquadCategoryId(change.toSquadId) === squad.id.toString()
        )
        .map(change => change.team);
      
      const allSquadTeams = [...effectiveTeams, ...incomingTeams];
      
      return {
        id: squad.id.toString(),
        name: squad.name,
        teams: allSquadTeams,
        maxTeams: squad.max_participants ? Math.ceil(squad.max_participants / 4) : undefined
      };
    });
  }

  // Check if all teams are assigned
  static areAllTeamsAssigned(
    unassignedTeams: EventTeamWithMembers[],
    pendingTeamAssignmentChanges: PendingTeamAssignmentChanges
  ): boolean {
    // Count teams moving to unassigned
    const movingToUnassigned = Object.values(pendingTeamAssignmentChanges).filter(
      change => normalizeSquadCategoryId(change.toSquadId) === null
    ).length;
    
    // If there are unassigned teams or teams moving to unassigned, not all are assigned
    return unassignedTeams.length === 0 && movingToUnassigned === 0;
  }

  // Check if all teams are assigned (simplified version)
  static areAllTeamsAssignedSimple(unassignedTeams: EventTeamWithMembers[]): boolean {
    return unassignedTeams?.length === 0;
  }
}
