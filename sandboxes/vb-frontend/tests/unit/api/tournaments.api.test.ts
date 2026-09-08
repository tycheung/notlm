import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { TournamentsAPI } from '@/api/tournaments';
import { mockAxiosDelete, mockAxiosGet, mockAxiosPost, mockAxiosPut, resetAxiosMocks } from '../../helpers/mockAxios';

describe('TournamentsAPI', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('getTournaments calls list endpoint with params', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 1, name: 'Spring Open' }] });

    const result = await TournamentsAPI.getTournaments({
      active_only: true,
      limit: 10,
    });

    expect(mockAxiosGet).toHaveBeenCalledWith('/tournaments', {
      params: { active_only: true, limit: 10 },
    });
    expect(result).toEqual([{ id: 1, name: 'Spring Open' }]);
  });

  it('getTournament fetches a single tournament by id', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 42, name: 'Fall Classic' } });

    const result = await TournamentsAPI.getTournament(42);

    expect(mockAxiosGet).toHaveBeenCalledWith('/tournaments/42');
    expect(result).toEqual({ id: 42, name: 'Fall Classic' });
  });

  it('createTournament posts to tournaments collection', async () => {
    const payload = { name: 'New Event', bowling_center_id: 3 };
    mockAxiosPost.mockResolvedValue({ data: { id: 99, ...payload } });

    const result = await TournamentsAPI.createTournament(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/tournaments', payload);
    expect(result.id).toBe(99);
  });

  it('deleteTournament calls delete on tournament resource', async () => {
    mockAxiosDelete.mockResolvedValue({});

    await TournamentsAPI.deleteTournament(15);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/tournaments/15');
  });

  it('updateTournament puts tournament fields', async () => {
    mockAxiosPut.mockResolvedValue({ data: { id: 42, name: 'Updated Open' } });

    const result = await TournamentsAPI.updateTournament(42, { name: 'Updated Open' });

    expect(mockAxiosPut).toHaveBeenCalledWith('/tournaments/42', { name: 'Updated Open' });
    expect(result.name).toBe('Updated Open');
  });

  it('getTournamentStats fetches tournament statistics', async () => {
    mockAxiosGet.mockResolvedValue({ data: { total_events: 2, total_participants: 40 } });

    const result = await TournamentsAPI.getTournamentStats(42);

    expect(mockAxiosGet).toHaveBeenCalledWith('/tournaments/42/stats');
    expect(result.total_events).toBe(2);
  });

  it('getTournamentWithCenter fetches tournament and center payload', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { id: 42, name: 'Open', bowling_center: { id: 3, name: 'Victory Lanes' } },
    });

    const result = await TournamentsAPI.getTournamentWithCenter(42);

    expect(mockAxiosGet).toHaveBeenCalledWith('/tournaments/42/with-center');
    expect(result.bowling_center?.name).toBe('Victory Lanes');
  });

  it('searchTournaments queries tournament search endpoint', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 1, name: 'Spring Open', city: 'Austin' }] });

    const result = await TournamentsAPI.searchTournaments({
      query: 'Spring',
      upcoming_only: true,
      limit: 5,
    });

    expect(mockAxiosGet).toHaveBeenCalledWith('/tournaments/search', {
      params: { query: 'Spring', upcoming_only: true, limit: 5 },
    });
    expect(result).toHaveLength(1);
  });

  it('getCurrentUserTournaments fetches tournaments for the current user', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 3, name: 'My Open' }] });

    const result = await TournamentsAPI.getCurrentUserTournaments();

    expect(mockAxiosGet).toHaveBeenCalledWith('/users/me/tournaments', {
      params: undefined,
    });
    expect(result).toHaveLength(1);
  });

  it('getRecommendedTournaments posts location with query params', async () => {
    const location = { latitude: 30.27, longitude: -97.74, radius: 25 };
    mockAxiosPost.mockResolvedValue({ data: [{ id: 1, name: 'Nearby Open' }] });

    const result = await TournamentsAPI.getRecommendedTournaments(location, 5, false);

    expect(mockAxiosPost).toHaveBeenCalledWith('/tournaments/recommended', location, {
      params: { limit: 5, upcoming_only: false },
    });
    expect(result).toHaveLength(1);
  });

  it('getUserTournaments fetches tournaments for a user with optional status', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 2, name: 'User Open' }] });

    const result = await TournamentsAPI.getUserTournaments(7, 'upcoming');

    expect(mockAxiosGet).toHaveBeenCalledWith('/users/7/tournaments', {
      params: { status: 'upcoming' },
    });
    expect(result[0].name).toBe('User Open');
  });

  it('getTournamentsNearHomeBase fetches tournaments near a home base', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 5, name: 'Home Base Open' }] });

    const result = await TournamentsAPI.getTournamentsNearHomeBase(3, 40, 6, false);

    expect(mockAxiosGet).toHaveBeenCalledWith('/tournaments/near-home-base/3', {
      params: { radius: 40, limit: 6, upcoming_only: false },
    });
    expect(result[0].name).toBe('Home Base Open');
  });
});
