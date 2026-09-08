import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { EventsAPI } from '@/api/events';
import { mockAxiosGet, mockAxiosPatch, mockAxiosPost, mockAxiosPut, mockAxiosDelete, resetAxiosMocks } from '../../helpers/mockAxios';

describe('EventsAPI', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('getCompleteEvent fetches event complete payload', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 5, name: 'Classic', rounds: [] } });

    const result = await EventsAPI.getCompleteEvent(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5/complete');
    expect(result.name).toBe('Classic');
  });

  it('getTournamentEvents filters by tournament id', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 1 }] });

    const result = await EventsAPI.getTournamentEvents(3);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/', {
      params: { tournament_id_filter: 3 },
    });
    expect(result).toHaveLength(1);
  });

  it('createEvent posts new event', async () => {
    const payload = { name: 'New Event', tournament_id: 2 };
    mockAxiosPost.mockResolvedValue({ data: { id: 99, ...payload } });

    const result = await EventsAPI.createEvent(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/events/', payload);
    expect(result.id).toBe(99);
  });

  it('getEvent fetches a single event by id', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 5, name: 'Classic' } });

    const result = await EventsAPI.getEvent(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5');
    expect(result.name).toBe('Classic');
  });

  it('getEventParticipants fetches roster with optional status filter', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 1, user_id: 2 }] });

    await EventsAPI.getEventParticipants(5, 'registered');

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5/participants', {
      params: { status: 'registered' },
    });
  });

  it('getEventStats fetches participant stats for an event', async () => {
    mockAxiosGet.mockResolvedValue({ data: { total_registrations: 12 } });

    const result = await EventsAPI.getEventStats(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5/stats');
    expect(result.total_registrations).toBe(12);
  });

  it('updateEvent patches event fields', async () => {
    mockAxiosPatch.mockResolvedValue({ data: { id: 5, name: 'Updated Classic' } });

    const result = await EventsAPI.updateEvent(5, { name: 'Updated Classic' });

    expect(mockAxiosPatch).toHaveBeenCalledWith('/events/5', { name: 'Updated Classic' });
    expect(result.name).toBe('Updated Classic');
  });

  it('getEventWithRounds fetches event and rounds payload', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 5, rounds: [{ id: 1 }] } });

    const result = await EventsAPI.getEventWithRounds(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5/rounds');
    expect(result.rounds).toHaveLength(1);
  });

  it('getEvents calls events collection with filters', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 1, name: 'Classic' }] });

    const result = await EventsAPI.getEvents({ tournament_id: 3, active_only: true });

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/', {
      params: { tournament_id: 3, active_only: true },
    });
    expect(result).toHaveLength(1);
  });

  it('deleteEvent calls delete on event resource', async () => {
    mockAxiosDelete.mockResolvedValue({ data: null });

    await EventsAPI.deleteEvent(5);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/events/5');
  });

  it('deleteEventParticipant calls delete on participant resource', async () => {
    mockAxiosDelete.mockResolvedValue({ data: null });

    await EventsAPI.deleteEventParticipant(5, 12);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/events/5/participants/12');
  });

  it('addParticipantToEvent posts participant payload', async () => {
    mockAxiosPost.mockResolvedValue({ data: { id: 20, user_id: 8, event_id: 5 } });

    const result = await EventsAPI.addParticipantToEvent(5, { user_id: 8, notes: 'Walk-in' });

    expect(mockAxiosPost).toHaveBeenCalledWith('/events/5/participants', {
      user_id: 8,
      notes: 'Walk-in',
    });
    expect(result.id).toBe(20);
  });

  it('patchEventRegistrationSettings patches registration settings', async () => {
    mockAxiosPatch.mockResolvedValue({ data: { id: 5, registration_open: false } });

    const result = await EventsAPI.patchEventRegistrationSettings(5, {
      registration_open: false,
    });

    expect(mockAxiosPatch).toHaveBeenCalledWith('/events/5/registration-settings', {
      registration_open: false,
    });
    expect(result.registration_open).toBe(false);
  });

  it('batchAddParticipantsToEvent posts batch participant payload', async () => {
    const payload = [{ user_id: 8 }, { user_id: 9, notes: 'Guest' }];
    mockAxiosPost.mockResolvedValue({ data: [{ id: 20, user_id: 8 }, { id: 21, user_id: 9 }] });

    const result = await EventsAPI.batchAddParticipantsToEvent(5, payload);

    expect(mockAxiosPost).toHaveBeenCalledWith('/events/5/participants/batch', payload);
    expect(result).toHaveLength(2);
  });

  it('downloadParticipantsCsvTemplate fetches participants csv template blob', async () => {
    mockAxiosGet.mockResolvedValue({ data: new Blob(['usbc_id,first_name,last_name']) });

    const result = await EventsAPI.downloadParticipantsCsvTemplate(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5/participants/csv-template', {
      responseType: 'blob',
    });
    expect(result).toBeInstanceOf(Blob);
  });

  it('uploadParticipantsCsv posts multipart participants csv', async () => {
    const file = new File(['usbc_id,first_name,last_name\n,Ada,Lovelace'], 'participants.csv', {
      type: 'text/csv',
    });
    mockAxiosPost.mockResolvedValue({ data: { success: true, created: 1, errors: [] } });

    const result = await EventsAPI.uploadParticipantsCsv(5, file);

    expect(mockAxiosPost).toHaveBeenCalledWith(
      '/events/5/participants/csv',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    expect(result.success).toBe(true);
  });

  it('updateEventParticipant patches participant fields', async () => {
    mockAxiosPatch.mockResolvedValue({ data: { id: 12, user_id: 8, notes: 'Updated' } });

    const result = await EventsAPI.updateEventParticipant(5, 12, { notes: 'Updated' });

    expect(mockAxiosPatch).toHaveBeenCalledWith('/events/5/participants/12', { notes: 'Updated' });
    expect(result.notes).toBe('Updated');
  });

  it('getFormatExport fetches event format export json', async () => {
    mockAxiosGet.mockResolvedValue({ data: { event_id: 5, rounds: [] } });

    const result = await EventsAPI.getFormatExport(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5/format-export');
    expect(result.event_id).toBe(5);
  });

  it('batchUnassignEventParticipantsFromAll posts bulk unassign payload', async () => {
    mockAxiosPost.mockResolvedValue({
      data: { success_count: 1, failed_count: 0, results: [] },
    });

    const result = await EventsAPI.batchUnassignEventParticipantsFromAll(5, {
      event_participant_ids: [12, 13],
    });

    expect(mockAxiosPost).toHaveBeenCalledWith('/events/5/participants/batch-unassign-all', {
      event_participant_ids: [12, 13],
    });
    expect(result.success_count).toBe(1);
  });

  it('checkInAllEventParticipants posts check-in-all endpoint', async () => {
    mockAxiosPost.mockResolvedValue({ data: { checked_in_count: 42 } });

    const result = await EventsAPI.checkInAllEventParticipants(5);

    expect(mockAxiosPost).toHaveBeenCalledWith('/events/5/participants/check-in-all');
    expect(result.checked_in_count).toBe(42);
  });

  it('batchCreateTeams posts team batch creation payload', async () => {
    const payload = {
      event_id: 5,
      team_size: 4,
      teams: [{ team_name: 'Strike Force', members: [{ user_id: 8 }] }],
    };
    mockAxiosPost.mockResolvedValue({
      data: { created_teams: [], created_users: [], total_teams: 1, total_members: 1 },
    });

    const result = await EventsAPI.batchCreateTeams(5, payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/events/5/teams/batch', payload);
    expect(result.total_teams).toBe(1);
  });

  it('getFinalNodes fetches championship final nodes', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 1, event_id: 5, name: 'Main' }] });

    const result = await EventsAPI.getFinalNodes(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5/final-nodes');
    expect(result).toHaveLength(1);
  });

  it('getUserHistoricalQualifyingAverages fetches user average history', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ average: 195, event_name: 'Prior Open' }] });

    const result = await EventsAPI.getUserHistoricalQualifyingAverages(8, 5);

    expect(mockAxiosGet).toHaveBeenNthCalledWith(1, '/users/8/historical-qualifying-averages', {
      params: { limit: 5 },
    });
    expect(result[0].average).toBe(195);
  });

  it('getEventPrizeDistribution fetches prize pool breakdown', async () => {
    mockAxiosGet.mockResolvedValue({ data: { event_id: 5, total_prize_pool: 1200 } });

    const result = await EventsAPI.getEventPrizeDistribution(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5/prize-distribution');
    expect(result.total_prize_pool).toBe(1200);
  });

  it('getEventChampionshipResults fetches championship placements by node', async () => {
    mockAxiosGet.mockResolvedValue({ data: { final_nodes: [] } });

    const result = await EventsAPI.getEventChampionshipResults(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5/championship-results');
    expect(result.final_nodes).toEqual([]);
  });

  it('recomputeEventChampionshipResults posts recompute endpoint', async () => {
    mockAxiosPost.mockResolvedValue({ data: { final_nodes: [{ final_node_id: 1, placements: [] }] } });

    const result = await EventsAPI.recomputeEventChampionshipResults(5);

    expect(mockAxiosPost).toHaveBeenCalledWith('/events/5/championship-results/recompute');
    expect(result.final_nodes).toHaveLength(1);
  });

  it('createFinalNode posts final node payload', async () => {
    const payload = {
      event_id: 5,
      name: 'Championship',
      placement_count: 3,
      prize_allocation_steps: [],
    };
    mockAxiosPost.mockResolvedValue({ data: { id: 9, ...payload } });

    const result = await EventsAPI.createFinalNode(5, payload);

    expect(mockAxiosPost).toHaveBeenCalledWith('/events/5/final-nodes', payload);
    expect(result.id).toBe(9);
  });

  it('updateFinalNode patches final node fields', async () => {
    mockAxiosPatch.mockResolvedValue({ data: { id: 9, name: 'Updated Node' } });

    const result = await EventsAPI.updateFinalNode(5, 9, { name: 'Updated Node' });

    expect(mockAxiosPatch).toHaveBeenCalledWith('/events/5/final-nodes/9', { name: 'Updated Node' });
    expect(result.name).toBe('Updated Node');
  });

  it('updateFinalNodesStandingsConfig puts standings config payload', async () => {
    const nodes = [{ final_node_id: 9, include_in_standings: true }];
    mockAxiosPut.mockResolvedValue({ data: [{ id: 9, include_in_standings: true }] });

    const result = await EventsAPI.updateFinalNodesStandingsConfig(5, nodes as never);

    expect(mockAxiosPut).toHaveBeenCalledWith('/events/5/final-nodes/standings-config', { nodes });
    expect(result).toHaveLength(1);
  });

  it('deleteFinalNode calls delete on final node resource', async () => {
    mockAxiosDelete.mockResolvedValue({});

    await EventsAPI.deleteFinalNode(5, 9);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/events/5/final-nodes/9');
  });

  it('getFinalPayouts fetches computed final payouts', async () => {
    mockAxiosGet.mockResolvedValue({ data: { event_id: 5, payouts: [] } });

    const result = await EventsAPI.getFinalPayouts(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5/final-payouts');
    expect(result.event_id).toBe(5);
  });

  it('getRoundLiveScores fetches live scoring snapshot for a round', async () => {
    mockAxiosGet.mockResolvedValue({ data: { event_id: 5, round_id: 3, squads: [] } });

    const result = await EventsAPI.getRoundLiveScores(5, 3);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/5/rounds/3/live-scores');
    expect(result.round_id).toBe(3);
  });

  it('registerForEventPublic posts public registration payload', async () => {
    const payload = { event_id: 5, user_id: 2 };
    mockAxiosPost.mockResolvedValue({ data: { status: 'registered' } });

    const result = await EventsAPI.registerForEventPublic(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/events/register-public', payload);
    expect(result).toEqual({ status: 'registered' });
  });
});
