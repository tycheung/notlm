import { describe, expect, it } from 'vitest';
import {
  laneMovementGridDensityProgress,
  resolveLaneMovementGridDensity,
} from '@/features/lanes/laneMovementGridDensity';

describe('laneMovementGridDensity', () => {
  it('keeps comfortable sizing for small grids', () => {
    expect(laneMovementGridDensityProgress(20, 6)).toBe(0);
    const density = resolveLaneMovementGridDensity(20, 6);
    expect(density.cssVars['--lm-font']).toBe('9.00pt');
    expect(density.compactChrome).toBe(false);
    expect(density.pageMargin).toBe('0.40in');
  });

  it('scales toward dense sizing for 36×36', () => {
    expect(laneMovementGridDensityProgress(36, 36)).toBe(1);
    const density = resolveLaneMovementGridDensity(36, 36);
    expect(density.cssVars['--lm-font']).toBe('6.25pt');
    expect(density.compactChrome).toBe(true);
    expect(density.pageMargin).toBe('0.28in');
  });

  it('uses the stricter of lane vs game pressure', () => {
    // 36 lanes alone should fully densify even with few games
    expect(laneMovementGridDensityProgress(36, 3)).toBe(1);
    // 36 games alone should fully densify even with few lanes
    expect(laneMovementGridDensityProgress(8, 36)).toBe(1);
    // Midway on lanes only
    expect(laneMovementGridDensityProgress(28, 6)).toBeCloseTo(0.5, 5);
  });
});
