import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { RoundsAPI } from '@/api/rounds';
import { mockAxiosGet, resetAxiosMocks } from '../../helpers/mockAxios';

/**
 * Freeze FE round-read paths against backend routes/rounds_reads.py:
 * GET /rounds/{id}/with-event, /with-games, /summary.
 */
describe('round read path contract', () => {
  beforeEach(() => {
    resetAxiosMocks();
    mockAxiosGet.mockResolvedValue({ data: { id: 5, round_id: 5, games: [], event: { id: 42 } } });
  });

  it('getRoundWithEvent hits /rounds/{id}/with-event', async () => {
    await RoundsAPI.getRoundWithEvent(5);
    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/5/with-event');
  });

  it('getRoundWithGames hits /rounds/{id}/with-games', async () => {
    await RoundsAPI.getRoundWithGames(5);
    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/5/with-games');
  });

  it('getRoundSummary hits /rounds/{id}/summary', async () => {
    await RoundsAPI.getRoundSummary(5);
    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/5/summary');
  });

  it('does not call retired list or alias paths', async () => {
    await RoundsAPI.getRoundWithGames(5);
    await RoundsAPI.getRoundWithEvent(5);
    await RoundsAPI.getRoundSummary(5);
    const urls = mockAxiosGet.mock.calls.map((call) => String(call[0]));
    expect(urls).not.toContain('/rounds/5/games');
    expect(urls).not.toContain('/rounds/summary');
  });
});
