import { describe, expect, it } from 'vitest';
import {
  buildLaneSlotOptions,
  currentLaneSelectValue,
  formatLaneSlotLabel,
  parseLaneSelectValue,
} from '@/features/lanes/slotLabels';

describe('slotLabels', () => {
  it('builds grouped slot labels for multi-depth lanes', () => {
    expect(formatLaneSlotLabel(3, 1, 3)).toBe('3B');
    expect(buildLaneSlotOptions([3, 4], 3).map((o) => o.label)).toEqual([
      '3A',
      '3B',
      '3C',
      '4D',
      '4E',
      '4F',
    ]);
  });

  it('parses single-lane and slotted select values', () => {
    expect(parseLaneSelectValue('', 1)).toEqual({ assigned_lane: null, lane_slot: null });
    expect(parseLaneSelectValue('5', 1)).toEqual({ assigned_lane: 5 });
    expect(parseLaneSelectValue('3:2', 3)).toEqual({ assigned_lane: 3, lane_slot: 2 });
    expect(parseLaneSelectValue('bad', 1)).toBeNull();
  });

  it('formats current select value from lane and slot', () => {
    expect(currentLaneSelectValue(null, null, 3)).toBe('');
    expect(currentLaneSelectValue(5, null, 1)).toBe('5');
    expect(currentLaneSelectValue(3, 2, 3)).toBe('3:2');
  });
});
