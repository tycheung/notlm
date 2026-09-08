import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { AdvancementPoolAPI } from '@/api/advancement-pool';
import {
  mockAxiosDelete,
  mockAxiosGet,
  mockAxiosPost,
  resetAxiosMocks,
} from '../../helpers/mockAxios';

describe('AdvancementPoolAPI', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('getPoolParticipants fetches pool entries for a round', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 1, target_round_id: 4 }] });

    const result = await AdvancementPoolAPI.getPoolParticipants(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/advancement-pool/round/4');
    expect(result).toHaveLength(1);
  });

  it('getOrderedEntrants fetches ordered entrant contract for a round', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { target_round_id: 4, ordered_entrants: [], diagnostics: { pool_count: 0 } },
    });

    const result = await AdvancementPoolAPI.getOrderedEntrants(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/advancement-pool/round/4/ordered-entrants');
    expect(result.target_round_id).toBe(4);
  });

  it('getUnassignedParticipants fetches unassigned pool entries', async () => {
    mockAxiosGet.mockResolvedValue({ data: [] });

    await AdvancementPoolAPI.getUnassignedParticipants(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/advancement-pool/round/4/unassigned');
  });

  it('assignToSquad posts pool assignment payload', async () => {
    const payload = { pool_entry_id: 9, squad_id: 2 };
    mockAxiosPost.mockResolvedValue({ data: { id: 9, assigned_squad_id: 2 } });

    const result = await AdvancementPoolAPI.assignToSquad(payload);

    expect(mockAxiosPost).toHaveBeenCalledWith('/advancement-pool/assign', payload);
    expect(result.assigned_squad_id).toBe(2);
  });

  it('removeFromPool deletes pool entry by id', async () => {
    mockAxiosDelete.mockResolvedValue({});

    await AdvancementPoolAPI.removeFromPool(9);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/advancement-pool/9');
  });

  it('bulkAddToPool posts bulk add payload', async () => {
    const payload = {
      participants: [],
      source_round_id: 3,
      target_round_id: 4,
      relationship_id: 7,
    };
    mockAxiosPost.mockResolvedValue({ data: { success: true, message: 'ok' } });

    const result = await AdvancementPoolAPI.bulkAddToPool(payload);

    expect(mockAxiosPost).toHaveBeenCalledWith('/advancement-pool/bulk-add', payload);
    expect(result.success).toBe(true);
  });

  it('getPoolByRelationship fetches entries for a relationship', async () => {
    mockAxiosGet.mockResolvedValue({ data: [] });

    await AdvancementPoolAPI.getPoolByRelationship(7);

    expect(mockAxiosGet).toHaveBeenCalledWith('/advancement-pool/relationship/7');
  });

  it('clearPoolForRound deletes all entries for a round', async () => {
    mockAxiosDelete.mockResolvedValue({ data: { success: true, message: 'cleared' } });

    const result = await AdvancementPoolAPI.clearPoolForRound(4);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/advancement-pool/round/4/clear');
    expect(result.success).toBe(true);
  });

  it('removeDuplicatePoolEntries deduplicates pool entries for a round', async () => {
    mockAxiosDelete.mockResolvedValue({ data: { success: true, count: 0 } });

    const result = await AdvancementPoolAPI.removeDuplicatePoolEntries(4);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/advancement-pool/round/4/deduplicate');
    expect(result.count).toBe(0);
  });
});
