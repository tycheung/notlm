import { describe, expect, it } from 'vitest';
import {
  allowsStandingsBasedSeeding,
  coerceBracketSeedModeForOpening,
  coercePodsBalanceModeForOpening,
  roundHasIncomingFeeder,
  roundRefHasIncomingFeeder,
} from '@/components/event/formatEditor/openingRoundSeeding';

describe('openingRoundSeeding', () => {
  it('detects incoming feeders by round id and template ref', () => {
    expect(
      roundHasIncomingFeeder(15, [{ source_round_id: 14, target_round_id: 15 }])
    ).toBe(true);
    expect(roundHasIncomingFeeder(15, [{ target_round_id: 99 }])).toBe(false);
    expect(
      roundRefHasIncomingFeeder('r2', [{ source_ref: 'r1', target_ref: 'r2' }])
    ).toBe(true);
  });

  it('disallows standings-based seeding on initial / no-feeder rounds', () => {
    expect(allowsStandingsBasedSeeding({ isInitialRound: true })).toBe(false);
    expect(allowsStandingsBasedSeeding({ hasIncomingFeeder: false })).toBe(false);
    expect(allowsStandingsBasedSeeding({ hasIncomingFeeder: true })).toBe(true);
    expect(allowsStandingsBasedSeeding({ isInitialRound: false })).toBe(true);
  });

  it('coerces by_seed to random on opening rounds', () => {
    expect(coerceBracketSeedModeForOpening('by_seed', false)).toBe('random');
    expect(coerceBracketSeedModeForOpening('manual', false)).toBe('manual');
    expect(coerceBracketSeedModeForOpening('by_seed', true)).toBe('by_seed');
    expect(coercePodsBalanceModeForOpening('by_seed', false)).toBe('random');
    expect(coercePodsBalanceModeForOpening('by_average', false)).toBe('random');
    expect(coercePodsBalanceModeForOpening('by_average', true)).toBe('by_seed');
    expect(coercePodsBalanceModeForOpening('manual', false)).toBe('manual');
  });
});
