import { describe, expect, it } from 'vitest';
import { formatPlacementOrdinal } from '@/utils/advancementCalculator';

describe('formatPlacementOrdinal', () => {
  it('formats ordinals', () => {
    expect(formatPlacementOrdinal(1)).toBe('1st');
    expect(formatPlacementOrdinal(2)).toBe('2nd');
    expect(formatPlacementOrdinal(3)).toBe('3rd');
    expect(formatPlacementOrdinal(11)).toBe('11th');
    expect(formatPlacementOrdinal(12)).toBe('12th');
    expect(formatPlacementOrdinal(21)).toBe('21st');
    expect(formatPlacementOrdinal(13)).toBe('13th');
    expect(formatPlacementOrdinal(22)).toBe('22nd');
    expect(formatPlacementOrdinal(23)).toBe('23rd');
  });
});
