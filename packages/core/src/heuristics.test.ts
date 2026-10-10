import { describe, expect, it } from 'vitest';
import {
  compileHeuristics,
  DEFAULT_HEURISTICS,
  heuristicsContainHostBleed,
} from './heuristics.js';
import { looksLikeClearOod } from './askNormalize.js';
import { looksLikeDeskHandoff } from './capabilityCatalog.js';
import { extractMultiSlotPatches } from './discourse.js';

const SAMPLE_BRAND = ['acme widget', 'forget acme', 'in acme'];

describe('heuristics pack extraction', () => {
  it('platform defaults have no injected host-brand tokens', () => {
    expect(heuristicsContainHostBleed(DEFAULT_HEURISTICS, SAMPLE_BRAND)).toBe(
      false
    );
    expect(heuristicsContainHostBleed(compileHeuristics({}), SAMPLE_BRAND)).toBe(
      false
    );
  });

  it('empty desk patterns never match desk handoff', () => {
    expect(looksLikeDeskHandoff('front desk standup briefing')).toBe(false);
    expect(looksLikeDeskHandoff('desk handoff summary', DEFAULT_HEURISTICS)).toBe(
      false
    );
  });

  it('pack desk patterns enable desk handoff', () => {
    const h = compileHeuristics({
      deskHandoffPatterns: ['\\bdesk handoff\\b', '\\bfront desk\\b'],
    });
    expect(looksLikeDeskHandoff('desk handoff summary', h)).toBe(true);
    expect(looksLikeDeskHandoff('front desk briefing', h)).toBe(true);
  });

  it('host OOD phrases are pack-only', () => {
    expect(looksLikeClearOod('forget acme')).toBe(false);
    const h = compileHeuristics({
      ood: { phrasePatterns: ['\\bforget acme\\b'] },
    });
    expect(looksLikeClearOod('forget acme', h)).toBe(true);
    expect(heuristicsContainHostBleed(h, SAMPLE_BRAND)).toBe(true);
  });

  it('refuses rain / weather forecasts as clear OOD', () => {
    expect(looksLikeClearOod('will it rain tomorrow in Columbus?')).toBe(true);
    expect(looksLikeClearOod('what is the weather today')).toBe(true);
  });

  it('refuses PII director-email probes and tax filing on pots', () => {
    expect(looksLikeClearOod('show me other directors emails')).toBe(true);
    expect(looksLikeClearOod('how do I file taxes on side pots?')).toBe(true);
  });

  it('slot extractors only apply from pack', () => {
    expect(extractMultiSlotPatches('8 seats', [])).toEqual({});
    const h = compileHeuristics({
      discourse: {
        slotExtractors: [
          {
            id: 'seats',
            pattern: '\\b(\\d+)\\s+seats?\\b',
            slotKey: 'seats',
            allowWithoutKeys: true,
          },
        ],
      },
    });
    expect(extractMultiSlotPatches('8 seats', [], h)).toEqual({ seats: '8' });
  });

  it('merges normalize fillers into discourse lead/trail', () => {
    const h = compileHeuristics(
      {},
      { leadingPoliteness: ['crew'], trailingFillers: ['in app'] }
    );
    expect(h.source.discourse?.leadFillers).toContain('crew');
    expect(h.source.discourse?.trailFillers).toContain('in app');
  });
});
