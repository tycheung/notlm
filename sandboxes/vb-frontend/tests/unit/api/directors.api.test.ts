import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { DirectorsAPI } from '@/api/directors';
import { mockAxiosDelete, mockAxiosGet, mockAxiosPut, resetAxiosMocks } from '../../helpers/mockAxios';

describe('DirectorsAPI', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('searchTDs queries director search endpoint', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 5, email: 'td@example.com' }] });

    const result = await DirectorsAPI.searchTDs('td@');

    expect(mockAxiosGet).toHaveBeenCalledWith('/directors/td-search', { params: { q: 'td@' } });
    expect(result).toHaveLength(1);
  });

  it('getEventDirectorAccess uses skip403Redirect', async () => {
    mockAxiosGet.mockResolvedValue({ data: { can_manage_event_info: true } });

    await DirectorsAPI.getEventDirectorAccess(12);

    expect(mockAxiosGet).toHaveBeenCalledWith('/directors/events/12/director-access', {
      skip403Redirect: true,
    });
  });

  it('getMyTournamentAccess fetches tournament-scoped caps', async () => {
    mockAxiosGet.mockResolvedValue({ data: { can_create_events_in_tournament: true } });

    const result = await DirectorsAPI.getMyTournamentAccess(7);

    expect(mockAxiosGet).toHaveBeenCalledWith('/directors/tournaments/7/my-access', {
      skip403Redirect: true,
    });
    expect(result.can_create_events_in_tournament).toBe(true);
  });

  it('getMyTournaments fetches tournaments this TD organizes', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 10, name: 'Spring Open' }] });

    const result = await DirectorsAPI.getMyTournaments();

    expect(mockAxiosGet).toHaveBeenCalledWith('/directors/my-tournaments/');
    expect(result).toEqual([{ id: 10, name: 'Spring Open' }]);
  });

  it('getMyDelegatedTournaments fetches tournaments the TD can run as a delegate', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 9, name: 'Delegated Open' }] });

    const result = await DirectorsAPI.getMyDelegatedTournaments();

    expect(mockAxiosGet).toHaveBeenCalledWith('/directors/my-delegated-tournaments/');
    expect(result).toEqual([{ id: 9, name: 'Delegated Open' }]);
  });

  it('upsertEventDelegation puts delegation payload', async () => {
    const body = { delegate_user_id: 3, can_manage_game_scoring: true };
    mockAxiosPut.mockResolvedValue({ data: { event_id: 4, ...body } });

    await DirectorsAPI.upsertEventDelegation(4, body as never);

    expect(mockAxiosPut).toHaveBeenCalledWith('/directors/events/4/delegations', body);
  });

  it('deleteTournamentPermission calls delete on permission resource', async () => {
    mockAxiosDelete.mockResolvedValue({});

    await DirectorsAPI.deleteTournamentPermission(2, 8);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/directors/tournaments/2/director-permissions/8');
  });

  it('listEventDelegations fetches event delegation rows', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ event_id: 4, delegate_user_id: 3 }] });

    const result = await DirectorsAPI.listEventDelegations(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/directors/events/4/delegations');
    expect(result).toHaveLength(1);
  });

  it('listTournamentPermissions fetches tournament permission rows', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ tournament_id: 2, delegate_user_id: 8 }] });

    const result = await DirectorsAPI.listTournamentPermissions(2);

    expect(mockAxiosGet).toHaveBeenCalledWith('/directors/tournaments/2/director-permissions');
    expect(result).toHaveLength(1);
  });

  it('deleteEventDelegation calls delete on delegation resource', async () => {
    mockAxiosDelete.mockResolvedValue({});

    await DirectorsAPI.deleteEventDelegation(4, 3);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/directors/events/4/delegations/3');
  });

  it('upsertTournamentPermission puts tournament permission payload', async () => {
    const body = { delegate_user_id: 8, can_create_events: true };
    mockAxiosPut.mockResolvedValue({ data: { tournament_id: 2, ...body } });

    const result = await DirectorsAPI.upsertTournamentPermission(2, body as never);

    expect(mockAxiosPut).toHaveBeenCalledWith('/directors/tournaments/2/director-permissions', body);
    expect(result.can_create_events).toBe(true);
  });
});
