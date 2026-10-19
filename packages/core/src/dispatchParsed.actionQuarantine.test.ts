import { describe, expect, it, vi } from 'vitest';
import { dispatchParsed } from './dispatchParsed.js';
import { loadPackFromJson } from './loadPack.js';
import { emptySession } from './slots.js';
import type { DispatchDeps } from './dispatchDeps.js';
import type { ParseUtteranceResult } from './types.js';

const pack = loadPackFromJson({
  manifest: { id: 'aq-demo' },
  flow: [
    {
      id: 'create_record',
      title: 'Create record',
      keywords: ['create record'],
      kind: 'hard',
      requires: [],
    },
  ],
  controls: [],
  intents: { aliases: {}, meta: [] },
  binders: {},
  faq: [
    {
      id: 'faq_howto',
      question: 'How do I create a record?',
      answer: 'Use Create record from the menu.',
      aliases: ['how do i create a record'],
    },
  ],
});

function deps(overrides: Partial<DispatchDeps> = {}): {
  d: DispatchDeps;
  executed: string[];
  repairs: Array<{ kind: string }>;
} {
  const executed: string[] = [];
  const repairs: Array<{ kind: string }> = [];
  let session = emptySession();
  const d: DispatchDeps = {
    text: 'open create record',
    pack,
    session,
    ctx: { pathname: '/', data: {} },
    features: { actionQuarantine: true },
    deferLowConfidenceToFallback: true,
    pushAssistant: vi.fn(),
    executeStep: (id) => {
      executed.push(id);
    },
    setSession: (updater) => {
      session = updater(session);
      d.session = session;
    },
    onCoachEvent: (ev) => {
      if (ev.type === 'repair') repairs.push({ kind: ev.kind });
    },
    ...overrides,
  };
  return { d, executed, repairs };
}

describe('dispatchParsed action quarantine', () => {
  it('defers mid-confidence goto to Laya (no executeStep)', () => {
    const { d, executed, repairs } = deps();
    const parsed: ParseUtteranceResult = {
      stepId: 'create_record',
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: 'goto:create_record',
      confidence: 'mid',
      probability: 0.6,
    };
    dispatchParsed(d, pack, parsed);
    expect(executed).toEqual([]);
    expect(repairs.some((r) => r.kind === 'low_confidence')).toBe(true);
  });

  it('allows high-confidence goto to launch', () => {
    const { d, executed } = deps();
    const parsed: ParseUtteranceResult = {
      stepId: 'create_record',
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: 'goto:create_record',
      confidence: 'high',
      probability: 0.95,
    };
    dispatchParsed(d, pack, parsed);
    expect(executed).toContain('create_record');
  });

  it('does not quarantine FAQ answer paths', () => {
    const { d, executed, repairs } = deps({ text: 'how do i create a record' });
    const parsed: ParseUtteranceResult = {
      stepId: null,
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: 'faq',
      faqId: 'faq_howto',
      confidence: 'mid',
      probability: 0.6,
    };
    dispatchParsed(d, pack, parsed);
    expect(executed).toEqual([]);
    expect(repairs.some((r) => r.kind === 'low_confidence')).toBe(false);
  });

  it('defers conceptual how-to parsed as high-confidence goto', () => {
    const { d, executed, repairs } = deps({
      text: 'How do I open reports for this event?',
    });
    const parsed: ParseUtteranceResult = {
      stepId: 'create_record',
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: 'goto:create_record',
      confidence: 'high',
      probability: 0.95,
    };
    dispatchParsed(d, pack, parsed);
    expect(executed).toEqual([]);
    expect(repairs.some((r) => r.kind === 'low_confidence')).toBe(true);
  });

  it('defers conceptual utterance that would entity-lookup navigate', () => {
    const packWithLookup = loadPackFromJson({
      manifest: { id: 'aq-lookup' },
      flow: [
        {
          id: 'create_record',
          title: 'Create record',
          keywords: ['create record'],
          kind: 'hard',
          requires: [],
        },
      ],
      controls: [],
      intents: { aliases: {}, meta: [] },
      binders: {},
      lookups: [
        {
          id: 'records',
          dataPath: 'records',
          utteranceHints: ['open', 'show'],
          entityWords: ['report', 'reports', 'record'],
          openPathTemplate: '/records/{{id}}',
        },
      ],
    });
    const navigated: string[] = [];
    const { d, executed, repairs } = deps({
      text: 'How do I open reports for this event?',
      pack: packWithLookup,
      ctx: {
        pathname: '/',
        data: {
          records: [{ id: 'r1', name: 'reports for this event' }],
        },
      },
      navigate: (path) => {
        navigated.push(path);
      },
      features: { actionQuarantine: true },
      deferLowConfidenceToFallback: true,
    });
    const parsed: ParseUtteranceResult = {
      stepId: null,
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: 'unknown',
      confidence: 'low',
    };
    dispatchParsed(d, packWithLookup, parsed);
    expect(executed).toEqual([]);
    expect(navigated).toEqual([]);
    expect(repairs.some((r) => r.kind === 'low_confidence')).toBe(true);
  });

  it('near-tie ambiguous candidates defer instead of collision launch', () => {
    const { d, executed, repairs } = deps({
      text: 'open something ambiguous',
      features: { actionQuarantine: true, conflictDelta: 0.15 },
      deferLowConfidenceToFallback: true,
    });
    const parsed: ParseUtteranceResult = {
      stepId: null,
      candidates: ['create_record', 'other_step'],
      candidateScores: [100, 92],
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: 'ambiguous',
      confidence: 'mid',
      probability: 0.7,
    };
    dispatchParsed(d, pack, parsed);
    expect(executed).toEqual([]);
    expect(repairs.some((r) => r.kind === 'low_confidence')).toBe(true);
  });

  it('shadowActionDefer sets wouldHaveGoneToLaya on repair event', () => {
    const shadows: boolean[] = [];
    const { d, executed } = deps({
      features: { actionQuarantine: true, shadowActionDefer: true },
      onCoachEvent: (ev) => {
        if (ev.type === 'repair' && ev.wouldHaveGoneToLaya) shadows.push(true);
      },
    });
    const parsed: ParseUtteranceResult = {
      stepId: 'create_record',
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: 'goto:create_record',
      confidence: 'mid',
      probability: 0.55,
    };
    dispatchParsed(d, pack, parsed);
    expect(executed).toEqual([]);
    expect(shadows).toEqual([true]);
  });
});
