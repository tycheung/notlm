import { describe, expect, it } from 'vitest';

import type { MysteryGameEntrySummaryReport } from '@/api/side-actions';
import { buildMysteryGameEntrySummaryReportDocument } from '@/features/side-actions/mystery-game/reports/buildMysteryGameEntrySummaryReportDocument';
import { mysteryGameOutcomeLabel } from '@/features/side-actions/mystery-game/reports/mysteryGameOutcomeLabel';

function basePot(
  overrides: Partial<MysteryGameEntrySummaryReport['pots'][number]> = {}
): MysteryGameEntrySummaryReport['pots'][number] {
  return {
    side_action_id: 1,
    side_action_name: 'Mystery Game',
    pool_id: 10,
    squad_id: 1,
    squad_name: 'Morning',
    entry_count: 4,
    entry_fee: 5,
    handicap_mode: 'scratch',
    game_scope: 'single',
    game_numbers: [1],
    min_mystery_score: 150,
    max_mystery_score: 250,
    no_match_policy: 'closest',
    divisions: { men: true, women: true },
    place_amounts: [20, 10],
    mystery_number: 200,
    spun: true,
    needs_respin: false,
    outcome: 'exact_match',
    fund: {
      collected: 20,
      expenses: 0,
      prize_fund: 20,
      payout_ready: true,
      overcommitted: false,
    },
    ...overrides,
  };
}

describe('mysteryGameOutcomeLabel', () => {
  it('maps exact_match, closest, and needs_respin', () => {
    expect(mysteryGameOutcomeLabel('exact_match')).toBe('Exact match');
    expect(mysteryGameOutcomeLabel('closest')).toBe('Closest score');
    expect(mysteryGameOutcomeLabel('needs_respin')).toBe('Re-spin required');
  });

  it('prefers needs_respin flag over outcome', () => {
    expect(
      mysteryGameOutcomeLabel('closest', { needsRespin: true })
    ).toBe('Re-spin required');
  });
});

describe('buildMysteryGameEntrySummaryReportDocument', () => {
  it('renders Exact match when outcome is exact_match', () => {
    const doc = buildMysteryGameEntrySummaryReportDocument({
      report_type: 'mystery_game_entry_summary',
      tournament_id: 1,
      tournament_name: 'Test Open',
      event_id: 1,
      event_name: 'Singles',
      scope: 'this',
      pots: [basePot({ outcome: 'exact_match' })],
    });
    expect(doc.html).toContain('Exact match');
    expect(doc.html).not.toContain('>Generated<');
  });

  it('renders Closest score and Re-spin required labels', () => {
    const closest = buildMysteryGameEntrySummaryReportDocument({
      report_type: 'mystery_game_entry_summary',
      tournament_id: 1,
      tournament_name: 'Test Open',
      event_id: 1,
      event_name: 'Singles',
      scope: 'this',
      pots: [basePot({ outcome: 'closest', mystery_number: 199 })],
    });
    expect(closest.html).toContain('Closest score');

    const respin = buildMysteryGameEntrySummaryReportDocument({
      report_type: 'mystery_game_entry_summary',
      tournament_id: 1,
      tournament_name: 'Test Open',
      event_id: 1,
      event_name: 'Singles',
      scope: 'this',
      pots: [basePot({ needs_respin: true, outcome: null, spun: false })],
    });
    expect(respin.html).toContain('Re-spin required');
  });
});
