import { describe, expect, it } from 'vitest';

import type { EventComplete, FinalNodeRead } from '@/types/event';
import {
  autoFillSingleUnknownCrossNode,
  getPrizeSplitStatusForEvent,
  getPrizeSplitStatusFromEdits,
  validateMultiNodePools,
} from '@/utils/finalNodePoolValidation';

function fn(
  partial: Partial<FinalNodeRead> & Pick<FinalNodeRead, 'node_pool_type' | 'node_pool_value'>
): FinalNodeRead {
  return {
    id: 1,
    event_id: 1,
    name: 'n',
    display_order: 0,
    include_in_standings: true,
    is_active: true,
    placement_count: 3,
    prize_allocation_steps: [],
    created_at: '',
    ...partial,
  };
}

describe('validateMultiNodePools', () => {
  it('requires a single percentage node to represent 100% of the net pool', () => {
    expect(
      validateMultiNodePools([fn({ node_pool_type: 'percentage', node_pool_value: 80 })], 1000, 10).ok
    ).toBe(false);
    expect(
      validateMultiNodePools([fn({ node_pool_type: 'percentage', node_pool_value: 100 })], 1000, 10).ok
    ).toBe(true);
  });

  it('requires percentages to sum to ~100 when all nodes are percentage', () => {
    const nodes = [
      fn({ id: 1, node_pool_type: 'percentage', node_pool_value: 40 }),
      fn({ id: 2, node_pool_type: 'percentage', node_pool_value: 50 }),
    ];
    expect(validateMultiNodePools(nodes, 1000, 10).ok).toBe(false);
    nodes[1].node_pool_value = 60;
    expect(validateMultiNodePools(nodes, 1000, 10).ok).toBe(true);
  });

  it('rejects mixed dollar slices exceeding net pool', () => {
    const nodes = [
      fn({ id: 1, node_pool_type: 'amount', node_pool_value: 600 }),
      fn({ id: 2, node_pool_type: 'amount', node_pool_value: 500 }),
    ];
    expect(validateMultiNodePools(nodes, 1000, 10).ok).toBe(false);
  });

  it('accepts zero active nodes and single full dollar node', () => {
    expect(validateMultiNodePools([], 1000, 10)).toEqual({
      ok: true,
      error: null,
      warning: null,
      totalAllocated: 1000,
    });

    const singleAmount = [fn({ id: 1, node_pool_type: 'amount', node_pool_value: 1000 })];
    expect(validateMultiNodePools(singleAmount, 1000, 10).ok).toBe(true);
  });

  it('rejects negative net pools and warns on under-allocated mixed slices', () => {
    expect(validateMultiNodePools([fn({ id: 1, node_pool_type: 'amount', node_pool_value: 100 })], -1, 10).ok).toBe(
      false
    );

    const mixed = [
      fn({ id: 1, node_pool_type: 'amount', node_pool_value: 400 }),
      fn({ id: 2, node_pool_type: 'amount', node_pool_value: 300 }),
    ];
    const result = validateMultiNodePools(mixed, 1000, 10);
    expect(result.ok).toBe(true);
    expect(result.warning).toContain('unallocated');
  });
});

function minimalEventComplete(over: Partial<EventComplete> = {}): EventComplete {
  return {
    ...(over as EventComplete),
  } as EventComplete;
}

describe('getPrizeSplitStatusForEvent', () => {
  it('matches validateMultiNodePools on active nodes and net pool from event', () => {
    const ec = minimalEventComplete({
      entry_fee: 0,
      additional_prize_pool: 1000,
      house_cut_type: 'percentage',
      house_cut_percentage: 0,
      house_cut_amount: 0,
    });
    const nodes = [
      fn({ id: 1, node_pool_type: 'percentage', node_pool_value: 40 }),
      fn({ id: 2, node_pool_type: 'percentage', node_pool_value: 50 }),
    ];
    const r = getPrizeSplitStatusForEvent(ec, nodes, 10);
    expect(r.ok).toBe(false);
    nodes[1].node_pool_value = 60;
    expect(getPrizeSplitStatusForEvent(ec, nodes, 10).ok).toBe(true);
  });

  it('flags one remaining percentage node that is not 100%', () => {
    const ec = minimalEventComplete({
      entry_fee: 0,
      additional_prize_pool: 1000,
      house_cut_type: 'percentage',
      house_cut_percentage: 0,
      house_cut_amount: 0,
    });
    const one = [fn({ id: 1, node_pool_type: 'percentage', node_pool_value: 80 })];
    expect(getPrizeSplitStatusForEvent(ec, one, 10).ok).toBe(false);
  });
});

describe('getPrizeSplitStatusFromEdits', () => {
  it('merges node edits before validating', () => {
    const nodes = [
      fn({ id: 1, node_pool_type: 'percentage', node_pool_value: 50 }),
      fn({ id: 2, node_pool_type: 'percentage', node_pool_value: 50 }),
    ];
    const edits = {
      1: { node_pool_type: 'percentage' as const, node_pool_value: 40 },
      2: { node_pool_type: 'percentage' as const, node_pool_value: 50 },
    };
    expect(getPrizeSplitStatusFromEdits(nodes, edits, 1000, 10).ok).toBe(false);
    edits[2].node_pool_value = 60;
    expect(getPrizeSplitStatusFromEdits(nodes, edits, 1000, 10).ok).toBe(true);
  });
});

describe('autoFillSingleUnknownCrossNode', () => {
  it('fills the missing percentage to reach 100%', () => {
    const rows = [
      { node_pool_type: 'percentage' as const, node_pool_value: 40 },
      { node_pool_type: 'percentage' as const, node_pool_value: null },
    ];
    const res = autoFillSingleUnknownCrossNode(rows, 1000, 10);
    expect(res).toEqual({ index: 1, value: 60 });
  });

  it('returns null when more than one unknown', () => {
    const rows = [
      { node_pool_type: 'percentage' as const, node_pool_value: null },
      { node_pool_type: 'percentage' as const, node_pool_value: null },
    ];
    expect(autoFillSingleUnknownCrossNode(rows, 1000, 10)).toBeNull();
  });

  it('fills a single unknown dollar amount slice', () => {
    const rows = [
      { node_pool_type: 'amount' as const, node_pool_value: 400 },
      { node_pool_type: 'amount' as const, node_pool_value: null },
    ];
    const filled = autoFillSingleUnknownCrossNode(rows, 1000, 10);
    expect(filled).not.toBeNull();
    expect(filled?.index).toBe(1);
    expect(typeof filled?.value).toBe('number');
  });

  it('fills unknown percentage in mixed-type rows via search', () => {
    const rows = [
      { node_pool_type: 'amount' as const, node_pool_value: 500 },
      { node_pool_type: 'percentage' as const, node_pool_value: null },
    ];
    const filled = autoFillSingleUnknownCrossNode(rows, 1000, 10);
    expect(filled).not.toBeNull();
    expect(filled?.index).toBe(1);
    expect(typeof filled?.value).toBe('number');
  });
});
