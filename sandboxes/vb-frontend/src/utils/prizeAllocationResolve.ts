/**
 * Mirrors backend/services/prize_pool_service.resolve_prize_allocation_steps for UI preview + Auto calculate.
 */

import type { PrizeAllocationStep } from '../types/event';

const TOL = 0.02;

const MODES = new Set([
  'fixed_amount',
  'percent_of_slice',
  'percent_of_remainder',
  'remainder',
]);

function targetPlaces(step: Record<string, unknown>, maxPlace: number): number[] {
  const p = Math.max(1, Math.min(maxPlace, Number(step.place) || 1));
  const peRaw = step.place_end;
  const pe = peRaw != null ? Math.max(1, Math.min(maxPlace, Number(peRaw))) : p;
  const lo = Math.min(p, pe);
  const hi = Math.max(p, pe);
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

export function resolvePrizeAllocationSteps(
  stepsInput: PrizeAllocationStep[],
  sliceTotal: number,
  placementCount: number
): { amounts: Record<string, number>; error: string | null } {
  const n = Math.max(1, Math.min(64, placementCount));
  if (sliceTotal < 0) {
    return { amounts: {}, error: 'Node slice cannot be negative.' };
  }
  let steps: PrizeAllocationStep[] = [...(stepsInput || [])];
  if (steps.length === 0) {
    if (n === 1) steps = [{ place: 1, mode: 'remainder' }];
    else if (n === 2) {
      steps = [
        { place: 1, mode: 'percent_of_slice', value: 60 },
        { place: 2, mode: 'percent_of_slice', value: 40 },
      ];
    } else if (n === 3) {
      steps = [
        { place: 1, mode: 'percent_of_slice', value: 50 },
        { place: 2, mode: 'percent_of_slice', value: 30 },
        { place: 3, mode: 'percent_of_slice', value: 20 },
      ];
    } else {
      const each = Math.round((100 / n) * 10000) / 10000;
      steps = Array.from({ length: n }, (_, i) => ({
        place: i + 1,
        mode: 'percent_of_slice' as const,
        value: each,
      }));
    }
  }

  const remainderSteps = steps.filter((s) => s.mode === 'remainder').length;
  if (remainderSteps > 1) {
    return { amounts: {}, error: "At most one allocation step may use mode 'remainder'." };
  }

  const totals: Record<number, number> = {};
  const add = (place: number, amt: number) => {
    totals[place] = (totals[place] || 0) + amt;
  };

  let remaining = Math.round(sliceTotal * 100) / 100;
  const S = Math.round(sliceTotal * 100) / 100;

  for (let idx = 0; idx < steps.length; idx++) {
    const step = steps[idx] as Record<string, unknown>;
    const mode = step.mode as string;
    if (!MODES.has(mode)) {
      return { amounts: {}, error: `Step ${idx + 1}: invalid mode.` };
    }
    let targets = targetPlaces(step, n);
    const value = step.value;

    if (mode !== 'remainder') {
      if (value == null || Number.isNaN(Number(value))) {
        return { amounts: {}, error: `Step ${idx + 1}: value is required.` };
      }
    }

    if (mode === 'fixed_amount') {
      const fv = Number(value);
      for (const tp of targets) {
        const amt = Math.round(fv * 100) / 100;
        add(tp, amt);
        remaining = Math.round((remaining - amt) * 100) / 100;
      }
    } else if (mode === 'percent_of_slice') {
      const fv = Number(value);
      for (const tp of targets) {
        const amt = Math.round((fv / 100) * S * 100) / 100;
        add(tp, amt);
        remaining = Math.round((remaining - amt) * 100) / 100;
      }
    } else if (mode === 'percent_of_remainder') {
      const fv = Number(value);
      for (const tp of targets) {
        const amt = Math.round((fv / 100) * Math.max(0, remaining) * 100) / 100;
        add(tp, amt);
        remaining = Math.round((remaining - amt) * 100) / 100;
      }
    } else if (mode === 'remainder') {
      if (targets.length === 0) {
        const empty = [];
        for (let i = 1; i <= n; i++) {
          if (!totals[i]) empty.push(i);
        }
        targets = empty.length ? empty : [n];
      }
      if (targets.length === 1) {
        add(targets[0], Math.round(remaining * 100) / 100);
      } else {
        const share = Math.round((remaining / targets.length) * 100) / 100;
        for (let i = 0; i < targets.length; i++) {
          const tp = targets[i];
          let amt: number;
          if (i === targets.length - 1) {
            amt = Math.round(remaining * 100) / 100;
          } else {
            amt = share;
            remaining = Math.round((remaining - amt) * 100) / 100;
          }
          add(tp, amt);
        }
      }
      remaining = 0;
    }

    if (remaining < -TOL) {
      return {
        amounts: {},
        error: `Step ${idx + 1}: allocation exceeds node slice.`,
      };
    }
  }

  if (Math.abs(remaining) > TOL) {
    return {
      amounts: {},
      error: `Payout steps leave ${remaining.toFixed(2)} unallocated (node slice ${S.toFixed(2)}).`,
    };
  }

  const totalAll = Object.values(totals).reduce((a, b) => a + b, 0);
  if (Math.abs(totalAll - S) > TOL) {
    return {
      amounts: {},
      error: `Total place payouts (${totalAll.toFixed(2)}) must equal node slice (${S.toFixed(2)}).`,
    };
  }

  const amounts: Record<string, number> = {};
  Object.keys(totals)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((k) => {
      const v = Math.round(totals[k] * 100) / 100;
      if (v > 0) amounts[String(k)] = v;
    });
  return { amounts, error: null };
}

/** Single unknown numeric value (non-remainder): scan for a value that resolves cleanly. */
export function autoFillSingleUnknownValue(
  steps: PrizeAllocationStep[],
  sliceTotal: number,
  placementCount: number
): { index: number; value: number } | null {
  const unknownIdx: number[] = [];
  steps.forEach((s, i) => {
    if (s.mode === 'remainder') return;
    const v = s.value;
    if (v === undefined || v === null || String(v).trim() === '' || Number.isNaN(Number(v))) {
      unknownIdx.push(i);
    }
  });
  if (unknownIdx.length !== 1) return null;
  const i = unknownIdx[0];
  const mode = steps[i].mode;
  if (mode !== 'percent_of_slice' && mode !== 'percent_of_remainder' && mode !== 'fixed_amount') {
    return null;
  }

  const trial = (x: number) => {
    const copy = steps.map((s, j) =>
      j === i ? { ...s, value: Math.round(x * 10000) / 10000 } : s
    );
    return resolvePrizeAllocationSteps(copy, sliceTotal, placementCount).error === null;
  };

  if (mode === 'percent_of_slice' || mode === 'percent_of_remainder') {
    for (let x = 0; x <= 100; x += 0.05) {
      if (trial(x)) return { index: i, value: Math.round(x * 100) / 100 };
    }
  } else {
    const hi = Math.max(sliceTotal, 1);
    for (let x = 0; x <= hi; x += 0.5) {
      if (trial(x)) return { index: i, value: Math.round(x * 100) / 100 };
    }
  }
  return null;
}
