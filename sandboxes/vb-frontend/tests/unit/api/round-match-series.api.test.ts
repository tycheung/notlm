import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { RoundMatchSeriesAPI } from '@/api/round-match-series';
import { mockAxiosGet, mockAxiosPatch, mockAxiosPost, resetAxiosMocks } from '../../helpers/mockAxios';

describe('RoundMatchSeriesAPI', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('list fetches match series for a round', async () => {
    mockAxiosGet.mockResolvedValue({ data: { round_id: 4, match_series: [] } });

    const result = await RoundMatchSeriesAPI.list(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4/match-series');
    expect(result.match_series).toEqual([]);
  });

  it('syncMatchStructure posts structure sync for a round', async () => {
    mockAxiosPost.mockResolvedValue({ data: { round_id: 4, synced: true } });

    const result = await RoundMatchSeriesAPI.syncMatchStructure(4);

    expect(mockAxiosPost).toHaveBeenCalledWith(
      '/rounds/4/match-structure/sync',
      null,
      { params: undefined }
    );
    expect(result.synced).toBe(true);
  });

  it('swapSlots posts bracket slot swap payload', async () => {
    const payload = {
      from_series_id: 1,
      from_side: 0 as const,
      to_series_id: 2,
      to_side: 1 as const,
    };
    mockAxiosPost.mockResolvedValue({
      data: { round_id: 4, swapped: true, updated_series: [] },
    });

    const result = await RoundMatchSeriesAPI.swapSlots(4, payload);

    expect(mockAxiosPost).toHaveBeenCalledWith('/rounds/4/match-series/swap', payload);
    expect(result.swapped).toBe(true);
  });

  it('generateStepladder posts stepladder generation payload', async () => {
    const payload = {
      ordered_seeds: [1, 2, 3],
      race_to_wins: 1,
      max_games: 3,
    };
    mockAxiosPost.mockResolvedValue({ data: { created: 2, ids: [12, 13] } });

    const result = await RoundMatchSeriesAPI.generateStepladder(4, payload);

    expect(mockAxiosPost).toHaveBeenCalledWith(
      '/rounds/4/match-series/generate-stepladder',
      payload
    );
    expect(result.created).toBe(2);
  });
});
