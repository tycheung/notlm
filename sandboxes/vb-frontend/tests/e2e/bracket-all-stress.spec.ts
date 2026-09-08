/**
 * Stress / hang checks for large bracket pot counts.
 * Run with: npx playwright test tests/e2e/bracket-all-stress.spec.ts
 * Skipped in default CI unless BRACKET_STRESS_E2E=1 (keeps GH job under 20m).
 */
import { test, expect } from '@playwright/test';
import {
  BRACKETS_REPORT_DEFAULT_CHUNK_POTS,
  BRACKETS_REPORT_UNCHUNKED_MAX_POTS,
  buildBracketsReportDocument,
} from '../../src/components/side_actions/reports/buildBracketsReportDocument';
import type { BracketsReport } from '../../src/api/side-actions';
import type { Bracket } from '../../src/utils/bracketEngine/types';

const runStress = process.env.BRACKET_STRESS_E2E === '1';

function syntheticBracket(id: number): Bracket {
  const seating = [1, 2, 3, 4, 5, 6, 7, 8];
  return {
    id,
    seating,
    rounds: [
      {
        matches: [
          { id: `${id}-0-0`, p1: 1, p2: 2, s1: '', s2: '' },
          { id: `${id}-0-1`, p1: 3, p2: 4, s1: '', s2: '' },
          { id: `${id}-0-2`, p1: 5, p2: 6, s1: '', s2: '' },
          { id: `${id}-0-3`, p1: 7, p2: 8, s1: '', s2: '' },
        ],
      },
      {
        matches: [
          { id: `${id}-1-0`, p1: null, p2: null, s1: '', s2: '' },
          { id: `${id}-1-1`, p1: null, p2: null, s1: '', s2: '' },
        ],
      },
      { matches: [{ id: `${id}-2-0`, p1: null, p2: null, s1: '', s2: '' }] },
    ],
  };
}

function syntheticReport(potCount: number): BracketsReport {
  return {
    report_type: 'brackets',
    side_action_id: 1,
    side_action_name: 'Stress Bracket',
    tournament_id: 1,
    tournament_name: 'Stress Open',
    event_id: 1,
    event_name: 'Squad A',
    pool_id: 9,
    squad_id: 1,
    squad_name: 'A',
    game_numbers: [1, 2, 3],
    bracket_count: potCount,
    brackets: Array.from({ length: potCount }, (_, i) => syntheticBracket(i)),
    user_display_names: {
      1: 'A',
      2: 'B',
      3: 'C',
      4: 'D',
      5: 'E',
      6: 'F',
      7: 'G',
      8: 'H',
    },
    payouts: { first: 25, second: 10 },
    bye_payouts: { first: 25, second: 10 },
    last_synced_game: null,
  };
}

test.describe('bracket report HTML scale', () => {
  test('chunked document builds within timeout for 100 pots', async () => {
    test.setTimeout(30_000);
    const report = syntheticReport(BRACKETS_REPORT_DEFAULT_CHUNK_POTS);
    const t0 = Date.now();
    const doc = buildBracketsReportDocument(report, {
      potFrom: 1,
      potTo: BRACKETS_REPORT_DEFAULT_CHUNK_POTS,
    });
    expect(Date.now() - t0).toBeLessThan(15_000);
    expect(doc.html.length).toBeGreaterThan(1000);
    expect(doc.html).toContain('Bracket 1');
  });

  test('unchunked gate constant is at most default chunk', () => {
    expect(BRACKETS_REPORT_UNCHUNKED_MAX_POTS).toBeLessThanOrEqual(
      BRACKETS_REPORT_DEFAULT_CHUNK_POTS
    );
  });

  test('range slice does not include pots outside window', () => {
    const report = syntheticReport(40);
    const doc = buildBracketsReportDocument(report, { potFrom: 11, potTo: 14 });
    expect(doc.html).toContain('Showing 11–14');
    expect(doc.suggestedFilename).toMatch(/pots_11-14/);
  });
});

test.describe('bracket stress (opt-in)', () => {
  test.skip(!runStress, 'Set BRACKET_STRESS_E2E=1 to run extreme HTML build');

  test('400-pot full build completes or documents hang risk', async () => {
    test.setTimeout(120_000);
    const report = syntheticReport(400);
    const t0 = Date.now();
    const doc = buildBracketsReportDocument(report, { potFrom: 1, potTo: 100 });
    expect(Date.now() - t0).toBeLessThan(60_000);
    expect(doc.html).toContain('Showing 1–100');
  });
});
