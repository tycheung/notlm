import { devLog } from './devLog';
import axiosInstance from './axios';
import {
  EventTeamUpdate,
  EventTeamWithMembers,
  EventTeamRegistration,
  PublicTeamSignUp,
  EventTeamCaptainUpdate,
} from '../types/event_team';

export class TeamsAPI {
  /**
   * Create a new event team
   */
  static async createEventTeam(eventId: number, teamData: EventTeamRegistration): Promise<EventTeamWithMembers> {
    const response = await axiosInstance.post(`/events/${eventId}/teams`, teamData);
    return response.data;
  }

  /** Public team sign-up (captain enters names; optional auth) */
  static async signUpEventTeamPublic(
    eventId: number,
    body: PublicTeamSignUp
  ): Promise<EventTeamWithMembers> {
    const response = await axiosInstance.post<EventTeamWithMembers>(
      `/events/${eventId}/teams/sign-up-public`,
      body
    );
    return response.data;
  }

  /**
   * Get all teams for an event
   */
  static async getEventTeams(eventId: number): Promise<EventTeamWithMembers[]> {
    const response = await axiosInstance.get(`/events/${eventId}/teams`);
    // Log raw API response
    devLog('Raw teams API response:', response.data);
    return response.data;
  }

  /**
   * Update event team information
   */
  static async updateEventTeam(
    eventId: number, 
    teamId: number, 
    teamUpdate: EventTeamUpdate
  ): Promise<EventTeamWithMembers> {
    const response = await axiosInstance.patch(`/events/${eventId}/teams/${teamId}`, teamUpdate);
    return response.data;
  }

  /**
   * Update team captain
   */
  static async updateTeamCaptain(
    eventId: number, 
    teamId: number, 
    captainData: EventTeamCaptainUpdate
  ): Promise<EventTeamWithMembers> {
    const response = await axiosInstance.post(`/events/${eventId}/teams/${teamId}/captain`, captainData);
    return response.data;
  }

  /**
   * Add a member to an existing event team
   */
  static async addTeamMember(eventId: number, teamId: number, memberData: { user_id: number; is_captain?: boolean; notes?: string }): Promise<EventTeamWithMembers> {
    const response = await axiosInstance.post<EventTeamWithMembers>(`/events/${eventId}/teams/${teamId}/members`, memberData);
    return response.data;
  }

  /**
   * Delete an entire event team
   */
  static async deleteEventTeam(eventId: number, teamId: number): Promise<void> {
    await axiosInstance.delete(`/events/${eventId}/teams/${teamId}`);
  }

} 