import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { roundRelationshipApi } from '@/services/roundRelationshipApi';
import {
  mockAxiosDelete,
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosPut,
  resetAxiosMocks,
} from '../../helpers/mockAxios';

describe('roundRelationshipApi', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('getRoundRelationships builds query string from filters', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 1 }] });

    const result = await roundRelationshipApi.getRoundRelationships({
      event_id: 42,
      active_only: true,
      skip: 0,
      limit: 50,
    });

    expect(mockAxiosGet).toHaveBeenCalledWith(
      '/round-relationships?event_id=42&active_only=true&skip=0&limit=50'
    );
    expect(result).toHaveLength(1);
  });

  it('getAllRoundRelationshipsForEvent paginates until a short page', async () => {
    mockAxiosGet
      .mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => ({ id: i + 1 })) })
      .mockResolvedValueOnce({ data: [{ id: 501 }] });

    const result = await roundRelationshipApi.getAllRoundRelationshipsForEvent(42);

    expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(501);
  });

  it('createRoundRelationship posts relationship payload', async () => {
    const payload = { source_round_id: 1, target_round_id: 2, event_id: 42 };
    mockAxiosPost.mockResolvedValue({ data: { id: 9, ...payload } });

    const result = await roundRelationshipApi.createRoundRelationship(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/round-relationships', payload);
    expect(result.id).toBe(9);
  });

  it('getRoundRelationship fetches relationship with round details', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 9, source_round_id: 1 } });

    const result = await roundRelationshipApi.getRoundRelationship(9);

    expect(mockAxiosGet).toHaveBeenCalledWith('/round-relationships/9');
    expect(result.id).toBe(9);
  });

  it('updateRoundRelationship puts relationship fields', async () => {
    mockAxiosPut.mockResolvedValue({ data: { id: 9, advancement_count: 8 } });

    const result = await roundRelationshipApi.updateRoundRelationship(9, {
      advancement_count: 8,
    } as never);

    expect(mockAxiosPut).toHaveBeenCalledWith('/round-relationships/9', { advancement_count: 8 });
    expect(result.advancement_count).toBe(8);
  });

  it('deleteRoundRelationship calls delete on relationship resource', async () => {
    mockAxiosDelete.mockResolvedValue({});

    await roundRelationshipApi.deleteRoundRelationship(9);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/round-relationships/9');
  });

  it('previewAdvancement fetches advancement preview', async () => {
    mockAxiosGet.mockResolvedValue({ data: { relationship_id: 9, candidates: [] } });

    const result = await roundRelationshipApi.previewAdvancement(9);

    expect(mockAxiosGet).toHaveBeenCalledWith('/round-relationships/9/preview');
    expect(result.relationship_id).toBe(9);
  });

  it('getEventFlow fetches event flow edges', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 'e1' }] });

    const result = await roundRelationshipApi.getEventFlow(42);

    expect(mockAxiosGet).toHaveBeenCalledWith('/round-relationships/event/42/flow');
    expect(result).toHaveLength(1);
  });

  it('getTournamentFlow fetches tournament flow graph', async () => {
    mockAxiosGet.mockResolvedValue({ data: { nodes: [], edges: [] } });

    const result = await roundRelationshipApi.getTournamentFlow(42);

    expect(mockAxiosGet).toHaveBeenCalledWith('/round-relationships/event/42/tournament-flow');
    expect(result.edges).toEqual([]);
  });
});
