import axiosInstance from '../api/axios';
import {
  RoundRelationshipCreate,
  RoundRelationshipUpdate,
  RoundRelationshipRead,
  RoundRelationshipWithRounds,
  AdvancementPreview,
  TournamentFlowEdge,
  TournamentFlow
} from '../types/roundRelationship';

export interface GetRoundRelationshipsParams {
  event_id?: number;
  active_only?: boolean;
  skip?: number;
  limit?: number;
}

export const roundRelationshipApi = {
  // Get round relationships with optional filtering
  async getRoundRelationships(params: GetRoundRelationshipsParams = {}) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    
    const queryString = searchParams.toString();
    const url = queryString ? `/round-relationships?${queryString}` : '/round-relationships';
    
    const response = await axiosInstance.get<RoundRelationshipRead[]>(url);
    return response.data;
  },

  // Get all relationships for an event (auto-paginates if backend pagination is applied)
  async getAllRoundRelationshipsForEvent(
    eventId: number,
    options?: { active_only?: boolean; pageSize?: number }
  ) {
    const pageSize = options?.pageSize ?? 500;
    const activeOnly = options?.active_only ?? true;
    const allRelationships: RoundRelationshipRead[] = [];
    let skip = 0;

    while (true) {
      const page = await roundRelationshipApi.getRoundRelationships({
        event_id: eventId,
        active_only: activeOnly,
        skip,
        limit: pageSize,
      });
      allRelationships.push(...page);
      if (page.length < pageSize) {
        break;
      }
      skip += pageSize;
    }

    return allRelationships;
  },

  // Create a new round relationship
  async createRoundRelationship(relationshipData: RoundRelationshipCreate) {
    const response = await axiosInstance.post<RoundRelationshipRead>('/round-relationships', relationshipData);
    return response.data;
  },

  // Get a specific round relationship with round details
  async getRoundRelationship(relationshipId: number) {
    const response = await axiosInstance.get<RoundRelationshipWithRounds>(`/round-relationships/${relationshipId}`);
    return response.data;
  },

  // Update a round relationship
  async updateRoundRelationship(relationshipId: number, updateData: RoundRelationshipUpdate) {
    const response = await axiosInstance.put<RoundRelationshipRead>(`/round-relationships/${relationshipId}`, updateData);
    return response.data;
  },

  // Delete a round relationship
  async deleteRoundRelationship(relationshipId: number) {
    await axiosInstance.delete(`/round-relationships/${relationshipId}`);
  },

  // Preview advancement for a relationship
  async previewAdvancement(relationshipId: number) {
    const response = await axiosInstance.get<AdvancementPreview>(`/round-relationships/${relationshipId}/preview`);
    return response.data;
  },

  // Get event flow (all relationships for an event)
  async getEventFlow(eventId: number) {
    const response = await axiosInstance.get<TournamentFlowEdge[]>(`/round-relationships/event/${eventId}/flow`);
    return response.data;
  },

  // Get tournament flow (complete flow with nodes and edges for an event)
  async getTournamentFlow(eventId: number) {
    const response = await axiosInstance.get<TournamentFlow>(`/round-relationships/event/${eventId}/tournament-flow`);
    return response.data;
  }
};

export default roundRelationshipApi; 