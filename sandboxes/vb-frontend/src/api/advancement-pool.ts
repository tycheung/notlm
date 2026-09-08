import axiosInstance from '../api/axios';

export interface AdvancementPoolRead {
  id: number;
  event_id: number;
  source_round_id: number;
  target_round_id: number;
  event_participant_id: number;
  user_id: number;
  advancement_relationship_id: number;
  advancement_position: number;
  advancement_criteria_type: string;
  advancement_criteria_value: number;
  is_assigned_to_squad: boolean;
  assigned_squad_id: number | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  event_participant?: {
    id: number;
    entry_number?: number;
    qualifying_average?: number;
  };
  source_round?: {
    id: number;
    round_number: number;
    friendly_name: string;
    name: string;
  };
}

export interface AdvancementPoolAssignment {
  pool_entry_id: number;
  squad_id: number;
}

export interface AdvancementPoolParticipantData {
  event_id: number;
  event_participant_id: number;
  user_id: number;
  position: number;
  score: number;
}

export interface AdvancementPoolBulkAdd {
  participants: AdvancementPoolParticipantData[];
  source_round_id: number;
  target_round_id: number;
  relationship_id: number;
}

export interface AdvancementPoolResponse {
  success: boolean;
  message: string;
  data?: AdvancementPoolRead;
  entries?: AdvancementPoolRead[];
  count?: number;
}

export interface OrderedEntrantRow {
  entrant_identity: 'participant' | 'team' | string;
  event_participant_id?: number | null;
  team_id?: number | null;
  pool_position: number;
  source_round_id: number;
  advancement_relationship_id: number;
  criteria_type: string;
  criteria_value: number;
  tiebreak_values?: Record<string, unknown>;
}

export interface OrderedEntrantsResponse {
  target_round_id: number;
  competition_method: string;
  ordered_entrants: OrderedEntrantRow[];
  diagnostics: {
    pool_count: number;
    ordered_entrant_count: number;
    series_count: number;
    has_match_series: boolean;
    unassigned_slots: number;
    order_source: string;
    structure_state: string;
    fallback_reasons?: string[];
  };
}

export const AdvancementPoolAPI = {
  /**
   * Get all participants in the advancement pool for a specific round
   */
  getPoolParticipants: async (roundId: number): Promise<AdvancementPoolRead[]> => {
    const response = await axiosInstance.get(`/advancement-pool/round/${roundId}`);
    return response.data;
  },

  getOrderedEntrants: async (roundId: number): Promise<OrderedEntrantsResponse> => {
    const response = await axiosInstance.get(`/advancement-pool/round/${roundId}/ordered-entrants`);
    return response.data;
  },

  /**
   * Get all unassigned participants in the advancement pool for a specific round
   */
  getUnassignedParticipants: async (roundId: number): Promise<AdvancementPoolRead[]> => {
    const response = await axiosInstance.get(`/advancement-pool/round/${roundId}/unassigned`);
    return response.data;
  },

  /**
   * Assign a pool participant to a squad
   */
  assignToSquad: async (assignment: AdvancementPoolAssignment): Promise<AdvancementPoolRead> => {
    const response = await axiosInstance.post('/advancement-pool/assign', assignment);
    return response.data;
  },

  /**
   * Remove a participant from the advancement pool
   */
  removeFromPool: async (poolEntryId: number): Promise<void> => {
    await axiosInstance.delete(`/advancement-pool/${poolEntryId}`);
  },

  /**
   * Bulk add participants to the advancement pool
   */
  bulkAddToPool: async (bulkData: AdvancementPoolBulkAdd): Promise<AdvancementPoolResponse> => {
    const response = await axiosInstance.post('/advancement-pool/bulk-add', bulkData);
    return response.data;
  },

  /**
   * Get all pool entries for a specific round relationship
   */
  getPoolByRelationship: async (relationshipId: number): Promise<AdvancementPoolRead[]> => {
    const response = await axiosInstance.get(`/advancement-pool/relationship/${relationshipId}`);
    return response.data;
  },

  /**
   * Clear all pool entries for a specific target round
   */
  clearPoolForRound: async (roundId: number): Promise<AdvancementPoolResponse> => {
    const response = await axiosInstance.delete(`/advancement-pool/round/${roundId}/clear`);
    return response.data;
  },

  /**
   * Remove duplicate pool entries for a specific target round
   */
  removeDuplicatePoolEntries: async (roundId: number): Promise<AdvancementPoolResponse> => {
    const response = await axiosInstance.delete(`/advancement-pool/round/${roundId}/deduplicate`);
    return response.data;
  },
};
