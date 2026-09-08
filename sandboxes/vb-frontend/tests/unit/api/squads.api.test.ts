import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { SquadsAPI } from '@/api/squads';
import { mockAxiosDelete, mockAxiosGet, mockAxiosPatch, mockAxiosPost, resetAxiosMocks } from '../../helpers/mockAxios';

describe('SquadsAPI', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('getSquad fetches squad by id', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 7, name: 'Morning' } });

    const result = await SquadsAPI.getSquad(7);

    expect(mockAxiosGet).toHaveBeenCalledWith('/squads/7');
    expect(result.name).toBe('Morning');
  });

  it('getEventSquads fetches squads for an event', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] });

    const result = await SquadsAPI.getEventSquads(42);

    expect(mockAxiosGet).toHaveBeenCalledWith('/squads/event/42', { params: undefined });
    expect(result).toHaveLength(2);
  });

  it('lockInSquad posts to squad lock-in endpoint', async () => {
    mockAxiosPost.mockResolvedValue({
      data: { message: 'Squad locked in successfully', games_created: 0 },
    });

    const result = await SquadsAPI.lockInSquad(9);

    expect(mockAxiosPost).toHaveBeenCalledWith('/squads/9/lock-in');
    expect(result.games_created).toBe(0);
  });

  it('unlockSquad posts to squad unlock endpoint', async () => {
    mockAxiosPost.mockResolvedValue({ data: { message: 'Squad unlocked' } });

    await SquadsAPI.unlockSquad(9);

    expect(mockAxiosPost).toHaveBeenCalledWith('/squads/9/unlock');
  });

  it('getAllEventSquads pages until a short page is returned', async () => {
    mockAxiosGet
      .mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => ({ id: i + 1 })) })
      .mockResolvedValueOnce({ data: [{ id: 501 }] });

    const result = await SquadsAPI.getAllEventSquads(42, 500);

    expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(501);
  });

  it('getRoundScoringRoster fetches scoring roster for a round', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { squads: [{ squad_id: 1, participants: [] }] },
    });

    const result = await SquadsAPI.getRoundScoringRoster(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/squads/round/5/scoring-roster');
    expect(result.squads).toHaveLength(1);
  });

  it('batchAssignParticipants posts batch assignment payload', async () => {
    const payload = { assignments: [{ squad_id: 1, event_participant_id: 2 }] };
    mockAxiosPost.mockResolvedValue({ data: { success: true, assigned: 1 } });

    await SquadsAPI.batchAssignParticipants(payload as any);

    expect(mockAxiosPost).toHaveBeenCalledWith('/squads/batch-assign', payload);
  });

  it('getRoundSquads fetches squads for a round', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 3, round_id: 5 }] });

    const result = await SquadsAPI.getRoundSquads(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/squads/round/5');
    expect(result).toHaveLength(1);
  });

  it('getSquadWithParticipants fetches squad participant payload', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 7, participants: [] } });

    const result = await SquadsAPI.getSquadWithParticipants(7);

    expect(mockAxiosGet).toHaveBeenCalledWith('/squads/7/participants');
    expect(result.participants).toEqual([]);
  });

  it('createSquad posts new squad payload', async () => {
    const payload = {
      name: 'Afternoon',
      round_id: 5,
      start_datetime: '2026-08-01T14:00:00',
      max_participants: 8,
      game_count: 3,
    };
    mockAxiosPost.mockResolvedValue({ data: { id: 8, ...payload } });

    const result = await SquadsAPI.createSquad(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/squads', payload);
    expect(result.id).toBe(8);
  });

  it('getSquadWithGames fetches squad games payload', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 7, games: [{ id: 20 }] } });

    const result = await SquadsAPI.getSquadWithGames(7);

    expect(mockAxiosGet).toHaveBeenCalledWith('/squads/7/games');
    expect(result.games).toHaveLength(1);
  });

  it('getSquadWithEvent fetches squad detail for breadcrumbs', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 1, name: 'Morning Squad', event_id: 42 } });

    const result = await SquadsAPI.getSquadWithEvent(1);

    expect(mockAxiosGet).toHaveBeenCalledWith('/squads/1');
    expect(result).toMatchObject({ id: 1, event_id: 42 });
  });

  it('getRoundParticipants fetches all squad participants for a round', async () => {
    mockAxiosGet.mockResolvedValue({ data: { squads: [{ squad_id: 1, participants: [] }] } });

    const result = await SquadsAPI.getRoundParticipants(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/squads/round/5/participants');
    expect(result.squads).toHaveLength(1);
  });

  it('getRoundTeams fetches team roster for a round', async () => {
    mockAxiosGet.mockResolvedValue({ data: { squads: [{ squad_id: 1, teams: [] }] } });

    const result = await SquadsAPI.getRoundTeams(5);

    expect(mockAxiosGet).toHaveBeenCalledWith('/squads/round/5/teams');
    expect(result.squads).toHaveLength(1);
  });

  it('createSquadForRound posts squad payload to round endpoint', async () => {
    const payload = {
      name: 'Late Squad',
      start_datetime: '2026-08-01T16:00:00',
      max_participants: 8,
      game_count: 3,
    };
    mockAxiosPost.mockResolvedValue({ data: { id: 9, round_id: 5, ...payload } });

    const result = await SquadsAPI.createSquadForRound(5, payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/squads/round/5', payload);
    expect(result.id).toBe(9);
  });

  it('batchRemoveParticipants posts batch removal payload', async () => {
    const payload = { removals: [{ squad_id: 1, event_participant_id: 2 }] };
    mockAxiosPost.mockResolvedValue({ data: { success: true, removed: 1 } });

    await SquadsAPI.batchRemoveParticipants(payload as any);

    expect(mockAxiosPost).toHaveBeenCalledWith('/squads/batch-remove', payload);
  });

  it('batchRegisterReentries posts batch reentry payload', async () => {
    const payload = { reentries: [{ event_participant_id: 2, squad_id: 1 }] };
    mockAxiosPost.mockResolvedValue({ data: { success: true, registered: 1 } });

    await SquadsAPI.batchRegisterReentries(payload as any);

    expect(mockAxiosPost).toHaveBeenCalledWith('/squads/batch-reentry', payload);
  });

  it('assignParticipantToSquad posts squad assignment payload', async () => {
    const payload = { squad_id: 1, event_participant_id: 2, assigned_lane: 3 };
    mockAxiosPost.mockResolvedValue({ data: { id: 10, ...payload } });

    await SquadsAPI.assignParticipantToSquad(payload as any);

    expect(mockAxiosPost).toHaveBeenCalledWith('/squads/assign', payload);
  });

  it('updateSquad patches squad fields', async () => {
    mockAxiosPatch.mockResolvedValue({ data: { id: 7, name: 'Updated Morning' } });

    const result = await SquadsAPI.updateSquad(7, { name: 'Updated Morning' });

    expect(mockAxiosPatch).toHaveBeenCalledWith('/squads/7', { name: 'Updated Morning' });
    expect(result.name).toBe('Updated Morning');
  });

  it('batchTeamSquadOperations posts team squad batch payload', async () => {
    const payload = { operations: [{ type: 'assign', squad_id: 1, team_id: 4 }] };
    mockAxiosPost.mockResolvedValue({ data: { success: true, applied: 1 } });

    await SquadsAPI.batchTeamSquadOperations(payload as any);

    expect(mockAxiosPost).toHaveBeenCalledWith('/squads/batch-team-operations', payload);
  });

  it('deleteSquad calls delete on squad resource', async () => {
    mockAxiosDelete.mockResolvedValue({ data: null });

    await SquadsAPI.deleteSquad(7);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/squads/7');
  });

  it('removeParticipantFromSquad calls delete on squad participant resource', async () => {
    mockAxiosDelete.mockResolvedValue({ data: null });

    await SquadsAPI.removeParticipantFromSquad(7, 12);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/squads/7/participants/12');
  });
});
