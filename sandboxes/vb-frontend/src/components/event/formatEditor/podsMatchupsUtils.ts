/** Pure Pods / Beat-the-pair sizing and membership helpers (mirrors BE membership.py). */

import { defaultAdvanceForSize } from '../../../utils/podsAdvanceDefaults';
import {
  seedSourceFromConfig,
  seedSourceToPatch,
  type SeedSourceConfig,
} from './seedSourceRound';

export { defaultAdvanceForSize };

export type PodsBalanceMode = 'by_seed' | 'random' | 'manual';
export type PodsRemainderMode = 'even' | 'prefer_max';

export type PodsDeskConfig = {
  pod_size_min: number;
  pod_size_max: number;
  /** When set (within min–max), even remainder mode targets this average pod size. */
  preferred_pod_size?: number | null;
  advance_by_size: Record<string, number>;
  balance_mode: PodsBalanceMode;
  remainder_mode: PodsRemainderMode;
  pod_membership?: number[][] | null;
} & SeedSourceConfig;

export function resolvePodSizeBounds(cfg: Record<string, unknown>): [number, number] {
  const legacy = cfg.pod_size;
  let rawMin = cfg.pod_size_min;
  let rawMax = cfg.pod_size_max;
  if (rawMax == null && legacy != null) rawMax = legacy;
  if (rawMin == null && legacy != null && rawMax == null) {
    rawMin = legacy;
    rawMax = legacy;
  }
  if (rawMin == null && rawMax == null) return [4, 4];
  if (rawMin == null) rawMin = rawMax;
  if (rawMax == null) rawMax = rawMin;
  const lo = Math.max(2, Number(rawMin) || 2);
  const hi = Math.max(lo, Number(rawMax) || lo);
  return [lo, hi];
}

export function normalizeAdvanceBySize(
  cfg: Record<string, unknown>,
  sizeMin?: number,
  sizeMax?: number
): Record<number, number> {
  const [lo, hi] =
    sizeMin != null && sizeMax != null
      ? [sizeMin, sizeMax]
      : resolvePodSizeBounds(cfg);
  const raw = (cfg.advance_by_size || {}) as Record<string, unknown>;
  const out: Record<number, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    const size = Number(key);
    const advance = Number(val);
    if (!Number.isFinite(size) || size < 2 || !Number.isFinite(advance)) continue;
    out[size] = Math.max(1, Math.min(advance, size - 1));
  }
  for (let size = lo; size <= hi; size += 1) {
    if (out[size] == null) out[size] = defaultAdvanceForSize(size);
  }
  return out;
}

export function computePodSizes(
  entrantCount: number,
  sizeMin: number,
  sizeMax: number,
  remainderMode: PodsRemainderMode = 'even',
  preferredPodSize?: number | null
): number[] {
  const n = Math.floor(entrantCount);
  const lo = Math.max(2, sizeMin);
  const hi = Math.max(lo, sizeMax);
  if (n < lo) return n >= 2 ? [n] : [];
  if (n <= hi) return [n];

  if (remainderMode === 'prefer_max') {
    const sizes: number[] = [];
    let remaining = n;
    while (remaining > 0) {
      if (remaining <= hi) {
        if (remaining < lo && sizes.length) {
          let need = lo - remaining;
          for (let i = sizes.length - 1; i >= 0 && need > 0; i -= 1) {
            const can = sizes[i] - lo;
            const take = Math.min(can, need);
            if (take <= 0) continue;
            sizes[i] -= take;
            remaining += take;
            need -= take;
          }
          if (remaining < lo && sizes.length) {
            sizes[sizes.length - 1] += remaining;
            remaining = 0;
            break;
          }
        }
        sizes.push(remaining);
        break;
      }
      sizes.push(hi);
      remaining -= hi;
    }
    return sizes.filter((s) => s >= 2);
  }

  const maxPods = Math.floor(n / lo);
  const minPods = Math.max(1, Math.ceil(n / hi));
  if (maxPods < minPods) return computePodSizes(n, lo, hi, 'prefer_max', preferredPodSize);
  const pref = Number(preferredPodSize);
  const targetAvg =
    Number.isFinite(pref) && pref >= lo && pref <= hi ? pref : (lo + hi) / 2;
  let bestK = minPods;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let k = minPods; k <= maxPods; k += 1) {
    const avg = n / k;
    if (avg < lo - 1e-9 || avg > hi + 1e-9) continue;
    const score = Math.abs(avg - targetAvg);
    if (score < bestScore) {
      bestScore = score;
      bestK = k;
    }
  }
  const base = Math.floor(n / bestK);
  const extra = n % bestK;
  return Array.from({ length: bestK }, (_, i) => base + (i < extra ? 1 : 0));
}

export function expectedAdvanceCount(
  podSizes: number[],
  advanceBySize: Record<string, number> | Record<number, number>
): number {
  let total = 0;
  for (const rawSize of podSizes) {
    const size = Number(rawSize);
    const advRaw =
      advanceBySize[String(size)] ??
      (advanceBySize as Record<number, number>)[size] ??
      defaultAdvanceForSize(size);
    let adv = Math.max(1, Number(advRaw) || 1);
    if (size > 1) adv = Math.min(adv, size - 1);
    total += adv;
  }
  return total;
}

/** Total advancers leaving a pods round (sum of per-pod cuts). */
export function resolvePodsAdvancementCount(input: {
  methodConfig: Record<string, unknown>;
  entrantCount?: number | null;
}): number | null {
  const cfg = input.methodConfig || {};
  const advance = normalizeAdvanceBySize(cfg);
  const membership = Array.isArray(cfg.pod_membership)
    ? (cfg.pod_membership as number[][])
    : null;
  if (membership?.length) {
    const sizes = membership
      .map((pod) => pod.filter((seed) => Number(seed) > 0).length)
      .filter((size) => size > 0);
    if (sizes.length) return expectedAdvanceCount(sizes, advance);
  }

  const entrantRaw = input.entrantCount ?? Number(cfg.entrant_count ?? 0);
  const entrant = Number.isFinite(entrantRaw) && entrantRaw >= 2 ? entrantRaw : null;
  if (entrant == null) return null;

  const [lo, hi] = resolvePodSizeBounds(cfg);
  const remainder: PodsRemainderMode =
    String(cfg.remainder_mode ?? 'even') === 'prefer_max' ? 'prefer_max' : 'even';
  const preferred =
    cfg.preferred_pod_size != null ? Number(cfg.preferred_pod_size) : null;
  const sizes = computePodSizes(entrant, lo, hi, remainder, preferred);
  if (!sizes.length) return null;
  return expectedAdvanceCount(sizes, advance);
}

export function snakeAssign<T>(ordered: T[], podSizes: number[]): T[][] {
  const pods: T[][] = podSizes.map(() => []);
  let cursor = 0;
  let roundNum = 0;
  while (cursor < ordered.length) {
    const indices =
      roundNum % 2 === 0
        ? [...Array(pods.length).keys()]
        : [...Array(pods.length).keys()].reverse();
    let placed = false;
    for (const podIdx of indices) {
      if (cursor >= ordered.length) break;
      if (pods[podIdx].length < podSizes[podIdx]) {
        pods[podIdx].push(ordered[cursor]);
        cursor += 1;
        placed = true;
      }
    }
    if (!placed) break;
    roundNum += 1;
  }
  return pods;
}

export function assignPods<T>(
  orderedIds: T[],
  podSizes: number[],
  balanceMode: PodsBalanceMode,
  membership?: T[][] | null
): T[][] {
  const total = podSizes.reduce((a, b) => a + b, 0);
  if (total !== orderedIds.length) {
    throw new Error(`pod sizes sum ${total} does not match entrant count ${orderedIds.length}`);
  }
  let mode = balanceMode || 'by_seed';
  if (mode === 'manual') {
    if (membership && membership.reduce((a, p) => a + p.length, 0) === orderedIds.length) {
      return membership.map((p) => [...p]);
    }
    mode = 'by_seed';
  }
  if (mode === 'random') {
    const items = [...orderedIds];
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    const pods: T[][] = [];
    let cursor = 0;
    for (const size of podSizes) {
      pods.push(items.slice(cursor, cursor + size));
      cursor += size;
    }
    return pods;
  }
  return snakeAssign(orderedIds, podSizes);
}

export function podsConfigFromRound(cfg: Record<string, unknown>): PodsDeskConfig {
  const [lo, hi] = resolvePodSizeBounds(cfg);
  const advance = normalizeAdvanceBySize(cfg, lo, hi);
  const advanceBySize: Record<string, number> = {};
  for (let size = lo; size <= hi; size += 1) {
    advanceBySize[String(size)] = advance[size] ?? defaultAdvanceForSize(size);
  }
  const balanceRaw = String(cfg.balance_mode ?? 'by_seed');
  // Legacy by_average → by_seed (same feeder/standings order in practice).
  const normalized =
    balanceRaw === 'by_average' ? 'by_seed' : balanceRaw;
  const balance_mode: PodsBalanceMode = (
    ['by_seed', 'random', 'manual'] as string[]
  ).includes(normalized)
    ? (normalized as PodsBalanceMode)
    : 'by_seed';
  const remainder_mode: PodsRemainderMode =
    String(cfg.remainder_mode ?? 'even') === 'prefer_max' ? 'prefer_max' : 'even';
  const membership = Array.isArray(cfg.pod_membership)
    ? (cfg.pod_membership as number[][])
    : null;
  const preferredRaw = cfg.preferred_pod_size;
  const preferred =
    preferredRaw == null || preferredRaw === ''
      ? null
      : Math.max(lo, Math.min(hi, Number(preferredRaw) || lo));
  return {
    pod_size_min: lo,
    pod_size_max: hi,
    preferred_pod_size: preferred,
    advance_by_size: advanceBySize,
    balance_mode,
    remainder_mode,
    pod_membership: membership,
    ...seedSourceFromConfig(cfg),
  };
}

export function podsConfigToPatch(
  draft: PodsDeskConfig,
  prevCfg: Record<string, unknown>
): Record<string, unknown> {
  const lo = Math.max(2, draft.pod_size_min);
  const hi = Math.max(lo, draft.pod_size_max);
  const advance: Record<string, number> = {};
  for (let size = lo; size <= hi; size += 1) {
    const raw = Number(draft.advance_by_size[String(size)] ?? defaultAdvanceForSize(size));
    advance[String(size)] = Math.max(1, Math.min(raw, size - 1));
  }
  return {
    ...seedSourceToPatch(draft, prevCfg),
    pod_size_min: lo,
    pod_size_max: hi,
    pod_size: hi,
    preferred_pod_size:
      draft.preferred_pod_size != null && Number.isFinite(Number(draft.preferred_pod_size))
        ? Math.max(lo, Math.min(hi, Number(draft.preferred_pod_size)))
        : null,
    advance_by_size: advance,
    balance_mode: draft.balance_mode,
    remainder_mode: draft.remainder_mode,
    pod_membership: draft.pod_membership ?? prevCfg.pod_membership ?? null,
    series_decision_mode: prevCfg.series_decision_mode ?? 'games_total',
  };
}

export type PodSeriesSection = {
  key: string;
  title: string;
  podIndex: number;
  series: Array<{
    id: number;
    display_order: number;
    match_label?: string | null;
    bracket_slot?: number | null;
    participants?: unknown[];
  }>;
};

export function groupSeriesByPod<T extends PodSeriesSection['series'][number]>(
  series: T[]
): PodSeriesSection[] {
  const buckets = new Map<number, T[]>();
  for (const row of series) {
    const pod =
      row.bracket_slot != null
        ? Number(row.bracket_slot)
        : Number(String(row.match_label || '').match(/Pod\s+(\d+)/i)?.[1] || 0) - 1;
    const key = Number.isFinite(pod) && pod >= 0 ? pod : 0;
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([podIndex, rows]) => ({
      key: `pod-${podIndex}`,
      title: `Pod ${podIndex + 1}`,
      podIndex,
      series: [...rows].sort((a, b) => a.display_order - b.display_order),
    }));
}
