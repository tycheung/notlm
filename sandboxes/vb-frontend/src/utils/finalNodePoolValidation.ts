/**
 * Cross-exit-node prize pool validation and single-unknown auto-fill.
 * See plan: final node prize redistribution.
 */

import type { EventComplete, FinalNodeRead } from '../types/event';
import { computeNodeSliceRaw, poolFromEventComplete } from './prizePoolClient';

export const MULTI_NODE_PCT_TOL = 0.05;
export const MULTI_NODE_DOLLAR_TOL = 0.02;

export type MultiNodeValidationResult = {
  ok: boolean;
  error: string | null;
  /** e.g. unallocated remainder when sum < net pool */
  warning: string | null;
  /** Sum of dollar slices (for mixed mode); for all-% equals netPool when valid */
  totalAllocated: number;
};

function minimalStub(
  poolType: FinalNodeRead['node_pool_type'],
  poolValue: number
): FinalNodeRead {
  return {
    id: 0,
    event_id: 0,
    name: '',
    display_order: 0,
    include_in_standings: true,
    is_active: true,
    placement_count: 1,
    node_pool_type: poolType,
    node_pool_value: poolValue,
    prize_allocation_steps: [],
    created_at: '',
  };
}

/**
 * Active final nodes only. For ≤1 active node, cross-node rules do not apply.
 */
export function validateMultiNodePools(
  activeNodes: FinalNodeRead[],
  netPool: number,
  participantCount: number
): MultiNodeValidationResult {
  if (activeNodes.length === 0) {
    return {
      ok: true,
      error: null,
      warning: null,
      totalAllocated: Math.max(0, netPool),
    };
  }

  if (activeNodes.length === 1) {
    const n = activeNodes[0];
    const t = n.node_pool_type || 'percentage';
    if (t === 'percentage') {
      const v = Number(n.node_pool_value ?? 0);
      if (Math.abs(v - 100) > MULTI_NODE_PCT_TOL) {
        return {
          ok: false,
          error: `With one active exit node, pool share must be 100% of the net pool (currently ${v.toFixed(1)}%).`,
          warning: null,
          totalAllocated: (v / 100) * netPool,
        };
      }
    } else {
      const slice = computeNodeSliceRaw(n, netPool, participantCount);
      if (Math.abs(slice - netPool) > MULTI_NODE_DOLLAR_TOL) {
        return {
          ok: false,
          error: `With one active exit node, this share must use the full net prize pool ($${netPool.toFixed(2)}).`,
          warning: null,
          totalAllocated: slice,
        };
      }
    }
    return {
      ok: true,
      error: null,
      warning: null,
      totalAllocated: Math.max(0, netPool),
    };
  }

  if (netPool < 0) {
    return {
      ok: false,
      error: 'Net prize pool cannot be negative.',
      warning: null,
      totalAllocated: 0,
    };
  }

  const allPct = activeNodes.every((n) => (n.node_pool_type || 'percentage') === 'percentage');

  if (allPct) {
    const sum = activeNodes.reduce((s, n) => s + Number(n.node_pool_value ?? 0), 0);
    if (Math.abs(sum - 100) > MULTI_NODE_PCT_TOL) {
      return {
        ok: false,
        error: `Percentages must sum to 100% (currently ${sum.toFixed(1)}%).`,
        warning: null,
        totalAllocated: (sum / 100) * netPool,
      };
    }
    return {
      ok: true,
      error: null,
      warning: null,
      totalAllocated: netPool,
    };
  }

  let total = 0;
  for (const n of activeNodes) {
    total += computeNodeSliceRaw(n, netPool, participantCount);
  }
  total = Math.round(total * 100) / 100;

  if (total > netPool + MULTI_NODE_DOLLAR_TOL) {
    return {
      ok: false,
      error: `Allocated $${total.toFixed(2)} exceeds net prize pool $${netPool.toFixed(2)}.`,
      warning: null,
      totalAllocated: total,
    };
  }

  let warning: string | null = null;
  if (total < netPool - MULTI_NODE_DOLLAR_TOL) {
    warning = `$${(netPool - total).toFixed(2)} of the net pool is unallocated.`;
  }

  return {
    ok: true,
    error: null,
    warning,
    totalAllocated: total,
  };
}

/**
 * Saved event: net pool from `EventComplete` + current exit nodes (server state).
 */
export function getPrizeSplitStatusForEvent(
  ec: EventComplete,
  exitNodes: FinalNodeRead[],
  approvedCount: number
): MultiNodeValidationResult {
  const netPool = poolFromEventComplete(ec, approvedCount);
  const active = exitNodes.filter((n) => n.is_active);
  return validateMultiNodePools(active, netPool, approvedCount);
}

export type NodePoolEdit = {
  node_pool_type: FinalNodeRead['node_pool_type'];
  node_pool_value: number;
};

/**
 * Prize fund modal: merged pool types/values from UI edits vs server exit nodes.
 */
export function getPrizeSplitStatusFromEdits(
  exitNodes: FinalNodeRead[],
  nodeEdits: Record<number, NodePoolEdit>,
  previewPool: number,
  approvedCount: number
): MultiNodeValidationResult {
  const active = exitNodes.filter((n) => n.is_active);
  const merged: FinalNodeRead[] = active.map((n) => {
    const ed = nodeEdits[n.id];
    if (!ed) return n;
    return { ...n, node_pool_type: ed.node_pool_type, node_pool_value: ed.node_pool_value };
  });
  return validateMultiNodePools(merged, previewPool, approvedCount);
}

export type CrossNodePoolInput = {
  node_pool_type: FinalNodeRead['node_pool_type'];
  /** null/undefined = unknown (exactly one across rows for auto-fill) */
  node_pool_value: number | null | undefined;
};

/**
 * Fills a single unknown `node_pool_value` so `validateMultiNodePools` passes.
 * Mirrors spirit of `autoFillSingleUnknownValue` in prizeAllocationResolve.ts.
 */
export function autoFillSingleUnknownCrossNode(
  rows: CrossNodePoolInput[],
  netPool: number,
  participantCount: number
): { index: number; value: number } | null {
  const unknownIdx: number[] = [];
  rows.forEach((r, i) => {
    const v = r.node_pool_value;
    if (v === null || v === undefined || Number.isNaN(Number(v))) {
      unknownIdx.push(i);
    }
  });
  if (unknownIdx.length !== 1) return null;
  const i = unknownIdx[0];
  const mode = rows[i].node_pool_type || 'percentage';

  const buildNodes = (value: number): FinalNodeRead[] =>
    rows.map((r, j) =>
      minimalStub(
        r.node_pool_type || 'percentage',
        j === i ? value : Number(r.node_pool_value ?? 0)
      )
    );

  const trial = (x: number) => {
    const v = Math.round(x * 10000) / 10000;
    return validateMultiNodePools(buildNodes(v), netPool, participantCount).ok;
  };

  if (rows.every((r) => (r.node_pool_type || 'percentage') === 'percentage')) {
    const others = rows.reduce((s, r, j) => {
      if (j === i) return s;
      return s + Number(r.node_pool_value ?? 0);
    }, 0);
    const val = Math.round((100 - others) * 100) / 100;
    if (val < -MULTI_NODE_PCT_TOL) return null;
    if (trial(val)) return { index: i, value: Math.max(0, val) };
    return null;
  }

  if (mode === 'percentage') {
    for (let x = 0; x <= 100; x += 0.05) {
      if (trial(x)) return { index: i, value: Math.round(x * 100) / 100 };
    }
  } else if (mode === 'amount') {
    const hi = Math.max(netPool, 1);
    for (let x = 0; x <= hi; x += 0.5) {
      if (trial(x)) return { index: i, value: Math.round(x * 100) / 100 };
    }
  } else {
    const maxPerEntry = netPool / Math.max(1, participantCount);
    const hi = Math.max(maxPerEntry * 2, 1);
    for (let x = 0; x <= hi; x += 0.05) {
      if (trial(x)) return { index: i, value: Math.round(x * 10000) / 10000 };
    }
  }

  return null;
}
