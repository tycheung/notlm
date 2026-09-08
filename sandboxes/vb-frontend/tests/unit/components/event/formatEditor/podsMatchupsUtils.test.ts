import { describe, expect, it } from 'vitest';
import {
  assignPods,
  computePodSizes,
  defaultAdvanceForSize,
  expectedAdvanceCount,
  groupSeriesByPod,
  podsConfigFromRound,
  podsConfigToPatch,
  resolvePodsAdvancementCount,
} from '@/components/event/formatEditor/podsMatchupsUtils';

describe('podsMatchupsUtils', () => {
  it('computes even remainder sizes within band', () => {
    const sizes = computePodSizes(22, 4, 6, 'even');
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(22);
    expect(sizes.every((s) => s >= 4 && s <= 6)).toBe(true);
  });

  it('prefers max-size pods when asked', () => {
    const sizes = computePodSizes(22, 4, 6, 'prefer_max');
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(22);
    expect(sizes.filter((s) => s === 6).length).toBeGreaterThanOrEqual(2);
  });

  it('targets preferred pod size in even remainder mode', () => {
    expect(computePodSizes(60, 4, 6, 'even', 6)).toEqual(Array(10).fill(6));
    expect(computePodSizes(60, 4, 6, 'even', 5)).toEqual(Array(12).fill(5));
    expect(computePodSizes(60, 4, 6, 'even', 4)).toEqual(Array(15).fill(4));
  });

  it('sums per-pod advance counts for relationship totals', () => {
    const total = expectedAdvanceCount(
      [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      { '5': 2 }
    );
    expect(total).toBe(24);
    expect(
      resolvePodsAdvancementCount({
        methodConfig: {
          pod_size_min: 4,
          pod_size_max: 6,
          advance_by_size: { '5': 2 },
          pod_membership: Array.from({ length: 12 }, () => [1, 2, 3, 4, 5]),
        },
      })
    ).toBe(24);
  });

  it('snake-assigns top seeds across pods', () => {
    const pods = assignPods([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [4, 4, 4], 'by_seed');
    expect(new Set(pods.map((p) => p[0]))).toEqual(new Set([1, 2, 3]));
  });

  it('round-trips desk config patch', () => {
    const from = podsConfigFromRound({
      pod_size_min: 3,
      pod_size_max: 5,
      advance_by_size: { '5': 2 },
      balance_mode: 'random',
      remainder_mode: 'prefer_max',
    });
    expect(from.advance_by_size['3']).toBe(defaultAdvanceForSize(3));
    expect(from.advance_by_size['5']).toBe(2);
    const patch = podsConfigToPatch(from, { game_style: 'baker' });
    expect(patch.pod_size_min).toBe(3);
    expect(patch.pod_size_max).toBe(5);
    expect(patch.remainder_mode).toBe('prefer_max');
    expect(patch.game_style).toBe('baker');
    expect(patch.seed_source_mode).toBe('feeder');
    expect(patch.seed_source_round_id).toBeNull();
  });

  it('round-trips seed source round mode', () => {
    const from = podsConfigFromRound({
      pod_size_min: 3,
      pod_size_max: 3,
      seed_source_mode: 'round',
      seed_source_round_id: 12,
    });
    expect(from.seed_source_mode).toBe('round');
    expect(from.seed_source_round_id).toBe(12);
    const patch = podsConfigToPatch(from, {});
    expect(patch.seed_source_mode).toBe('round');
    expect(patch.seed_source_round_id).toBe(12);
  });

  it('round-trips all_rounds seed source mode', () => {
    const from = podsConfigFromRound({
      pod_size_min: 3,
      pod_size_max: 3,
      seed_source_mode: 'all_rounds',
    });
    expect(from.seed_source_mode).toBe('all_rounds');
    expect(from.seed_source_round_id).toBeNull();
    const patch = podsConfigToPatch(from, {});
    expect(patch.seed_source_mode).toBe('all_rounds');
    expect(patch.seed_source_round_id).toBeNull();
  });

  it('groups series by bracket_slot pod index', () => {
    const sections = groupSeriesByPod([
      { id: 1, display_order: 0, bracket_slot: 0, match_label: 'Pod 1 · Match 1' },
      { id: 2, display_order: 1, bracket_slot: 0, match_label: 'Pod 1 · Match 2' },
      { id: 3, display_order: 2, bracket_slot: 1, match_label: 'Pod 2 · Match 1' },
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0].series).toHaveLength(2);
    expect(sections[1].title).toBe('Pod 2');
  });
});
