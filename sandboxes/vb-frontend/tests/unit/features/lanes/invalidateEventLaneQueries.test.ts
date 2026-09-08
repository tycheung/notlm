import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateEventLaneQueries } from '@/features/lanes/invalidateEventLaneQueries';

describe('invalidateEventLaneQueries', () => {
  it('invalidates board, management, and all score sheets when round is omitted', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateEventLaneQueries(queryClient, 42);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['eventLaneBoard', 42] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['eventLaneManagement', 42] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['eventLaneScoreSheet', 42],
    });
  });

  it('scopes score sheet invalidation when roundId is provided', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateEventLaneQueries(queryClient, 7, { roundId: 3 });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['eventLaneScoreSheet', 7, 3],
    });
  });
});
