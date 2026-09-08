import { describe, expect, it } from 'vitest';
import { resolvePrizeAllocationSteps } from '../../../src/utils/prizeAllocationResolve';
import { getPrizeSplitStatusFromEdits } from '../../../src/utils/finalNodePoolValidation';
import type { FinalNodeRead } from '../../../src/types/event';

const stubNode = (overrides: Partial<FinalNodeRead> = {}): FinalNodeRead => ({
  id: 1,
  event_id: 1,
  name: 'Championship',
  display_order: 0,
  include_in_standings: true,
  is_active: true,
  placement_count: 2,
  node_pool_type: 'percentage',
  node_pool_value: 50,
  prize_allocation_steps: [
    { place: 1, mode: 'percent_of_slice', value: 50 },
  ],
  created_at: '',
  ...overrides,
});

describe('prize settings validation (non-blocking save)', () => {
  it('detects invalid cross-node split without blocking save semantics', () => {
    const nodes = [stubNode()];
    const edits = { 1: { node_pool_type: 'percentage' as const, node_pool_value: 50 } };
    const status = getPrizeSplitStatusFromEdits(nodes, edits, 1000, 10);
    expect(status.ok).toBe(false);
    expect(status.error).toMatch(/100%/);
  });

  it('detects unallocated payout steps', () => {
    const steps = [{ place: 1, mode: 'percent_of_slice' as const, value: 50 }];
    const { error } = resolvePrizeAllocationSteps(steps, 200, 2);
    expect(error).toBeTruthy();
  });

  it('accepts balanced payout steps', () => {
    const steps = [
      { place: 1, mode: 'percent_of_slice' as const, value: 60 },
      { place: 2, mode: 'percent_of_slice' as const, value: 40 },
    ];
    const { error, amounts } = resolvePrizeAllocationSteps(steps, 200, 2);
    expect(error).toBeNull();
    expect(amounts['1']).toBeCloseTo(120, 1);
    expect(amounts['2']).toBeCloseTo(80, 1);
  });
});
