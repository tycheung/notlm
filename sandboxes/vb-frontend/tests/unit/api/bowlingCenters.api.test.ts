import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BowlingCentersAPI } from '@/api/bowling-centers';
import { mockAxiosDelete, mockAxiosGet, mockAxiosPost, mockAxiosPut, resetAxiosMocks } from '../../helpers/mockAxios';

describe('BowlingCentersAPI', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('getBowlingCenters calls list endpoint with filters', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 1, name: 'Victory Lanes' }] });

    const result = await BowlingCentersAPI.getBowlingCenters({
      search: 'victory',
      state: 'OH',
      active_only: true,
    });

    expect(mockAxiosGet).toHaveBeenCalledWith('/bowling-centers', {
      params: { search: 'victory', state: 'OH', active_only: true },
    });
    expect(result).toHaveLength(1);
  });

  it('getBowlingCenter fetches a single center', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 4, name: 'Metro Bowl' } });

    const result = await BowlingCentersAPI.getBowlingCenter(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/bowling-centers/4');
    expect(result.name).toBe('Metro Bowl');
  });

  it('createBowlingCenter posts payload with created_by when user in storage', async () => {
    const payload = {
      name: 'New Center',
      address1: '1 St',
      city: 'X',
      state: 'OH',
      postal_code: '1',
      lane_count: 20,
    };
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ id: 7 }),
    });
    mockAxiosPost.mockResolvedValue({ data: { id: 9, ...payload } });

    const result = await BowlingCentersAPI.createBowlingCenter(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/bowling-centers', { ...payload, created_by: 7 });
    expect(result.id).toBe(9);
    vi.unstubAllGlobals();
  });

  it('updateBowlingCenter puts center fields', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ id: 7 }),
    });
    mockAxiosPut.mockResolvedValue({ data: { id: 4, name: 'Updated Metro' } });

    const result = await BowlingCentersAPI.updateBowlingCenter(4, { name: 'Updated Metro' } as never);

    expect(mockAxiosPut).toHaveBeenCalledWith('/bowling-centers/4', {
      name: 'Updated Metro',
      updated_by: 7,
    });
    expect(result.name).toBe('Updated Metro');
    vi.unstubAllGlobals();
  });

  it('deleteBowlingCenter calls delete on center resource', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ id: 7 }),
    });
    mockAxiosDelete.mockResolvedValue({});

    await BowlingCentersAPI.deleteBowlingCenter(4);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/bowling-centers/4', {
      params: { updated_by: 7 },
    });
    vi.unstubAllGlobals();
  });

  it('searchBowlingCenters queries center search endpoint', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 2, name: 'Downtown Lanes' }] });

    const result = await BowlingCentersAPI.searchBowlingCenters({
      query: 'downtown',
      state: 'TX',
      limit: 5,
    });

    expect(mockAxiosGet).toHaveBeenCalledWith('/bowling-centers/search', {
      params: { query: 'downtown', state: 'TX', limit: 5 },
    });
    expect(result).toHaveLength(1);
  });

  it('getCenterWithTournaments fetches center with tournament list', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { id: 6, name: 'Victory Lanes', tournaments: [{ id: 10, name: 'Summer Open' }] },
    });

    const result = await BowlingCentersAPI.getCenterWithTournaments(6, true);

    expect(mockAxiosGet).toHaveBeenCalledWith('/bowling-centers/6/tournaments', {
      params: { include_inactive: true },
    });
    expect(result.tournaments).toHaveLength(1);
  });

  it('getBowlingCenterStats fetches center statistics', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { center_id: 6, total_tournaments: 4, active_tournaments: 2 },
    });

    const result = await BowlingCentersAPI.getBowlingCenterStats(6);

    expect(mockAxiosGet).toHaveBeenCalledWith('/bowling-centers/6/stats');
    expect(result.total_tournaments).toBe(4);
  });

  it('searchCentersByCoordinates posts location payload', async () => {
    mockAxiosPost.mockResolvedValue({
      data: [{ id: 7, name: 'Nearby Bowl', distance: 3.2 }],
    });

    const result = await BowlingCentersAPI.searchCentersByCoordinates({
      latitude: 40.7,
      longitude: -74.0,
      radius: 25,
    });

    expect(mockAxiosPost).toHaveBeenCalledWith('/bowling-centers/near-me', {
      latitude: 40.7,
      longitude: -74.0,
      radius: 25,
    });
    expect(result[0].name).toBe('Nearby Bowl');
  });
});
