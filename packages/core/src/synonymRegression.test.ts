import { describe, expect, it } from 'vitest';
import { dispatchUserUtterance } from './dispatch.js';
import {
  extractLookupName,
  looksLikeStepActionQuery,
  matchEntityLookup,
} from './entityLookup.js';
import { parseUtterance } from './intents.js';
import { loadPackFromJson } from './loadPack.js';
import { emptySession } from './slots.js';
import type { FlowStepDef, LookupDef, NormalizeConfig, SessionSlots } from './types.js';

const TEST_NORMALIZE: NormalizeConfig = {
  replacements: [
    { from: 'recrod', to: 'record' },
    { from: 'creat', to: 'create' },
  ],
  surfaceWords: [
    'form',
    'forms',
    'page',
    'pages',
    'screen',
    'screens',
    'dialog',
    'dialogs',
    'modal',
    'modals',
    'wizard',
    'wizards',
    'panel',
    'panels',
    'drawer',
    'drawers',
    'window',
    'windows',
    'tab',
    'tabs',
    'sheet',
    'sheets',
    'popup',
    'popups',
    'overlay',
    'overlays',
    'menu',
    'menus',
    'view',
    'views',
    'ui',
  ],
  trailingFillers: ['for me', 'please', 'real quick', 'kindly', 'thanks', 'now'],
  leadingPoliteness: ['can you', 'could you', 'would you', 'will you'],
  openVerbAliases: [
    { from: 'pull up', to: 'open' },
    { from: 'bring up', to: 'open' },
    { from: 'fire up', to: 'open' },
    { from: 'hop into', to: 'open' },
    { from: 'launch', to: 'open' },
    { from: 'take me to', to: 'go to' },
  ],
  openVerbPrefixes: ['open', 'show me', 'go to', 'find', 'pull up', 'bring up', 'launch'],
};

/**
 * Regression: UI surface / open-verb / politeness synonyms must not turn
 * create/goto step asks into entity-list misses, while real named opens still work.
 */

const flow: FlowStepDef[] = [
  {
    id: 'create_record',
    title: 'Create record',
    keywords: ['create record', 'new record', 'record'],
    kind: 'hard',
    requires: [],
  },
  {
    id: 'create_event',
    title: 'Create event',
    keywords: ['create event', 'new event', 'add event'],
    kind: 'hard',
    requires: ['create_record'],
  },
  {
    id: 'apply_format',
    title: 'Event format',
    keywords: ['format', 'apply format', 'event format'],
    kind: 'hard',
    requires: ['create_event'],
  },
  {
    id: 'office_center',
    title: 'Office centers',
    keywords: ['office center', 'center', 'house'],
    kind: 'soft',
    requires: [],
  },
];

const recordLookup: LookupDef = {
  id: 'records',
  dataPath: 'records',
  nameKey: 'name',
  idKey: 'id',
  utteranceHints: ['show me', 'open', 'find', 'go to', 'where is', 'pull up', 'bring up'],
  entityWords: ['record', 'records'],
};

const eventLookup: LookupDef = {
  id: 'events',
  dataPath: 'events',
  nameKey: 'name',
  idKey: 'id',
  utteranceHints: ['show me', 'open', 'find', 'go to', 'pull up'],
  entityWords: ['event', 'events'],
};

const pack = loadPackFromJson({
  manifest: { id: 'synonym-regression' },
  flow,
  controls: [
    { id: 'nav-t', stepId: 'create_record', path: '/records/new' },
    { id: 'nav-e', stepId: 'create_event', path: '/events/new' },
    { id: 'nav-f', stepId: 'apply_format', path: '/format' },
    { id: 'nav-c', stepId: 'office_center', path: '/centers' },
  ],
  intents: {
    aliases: {
      create_record: [
        'create record',
        'make a record',
        'start a record',
        'new record',
      ],
      create_event: ['create event', 'add event', 'make an event'],
      apply_format: ['event format', 'apply format', 'set up format'],
      office_center: ['office center', 'open centers'],
    },
    meta: ['go_back', 'whats_next', 'help'],
  },
  binders: {
    create_record: { path: 'data.hasRecord', op: 'eq', value: true },
    create_event: { path: 'data.hasEvent', op: 'eq', value: true },
    apply_format: { path: 'data.hasFormat', op: 'eq', value: true },
    office_center: { path: 'data.hasCenter', op: 'eq', value: true },
  },
  lookups: [recordLookup, eventLookup],
  normalize: TEST_NORMALIZE,
});

const SURFACES = [
  'form',
  'page',
  'screen',
  'dialog',
  'modal',
  'wizard',
  'panel',
  'drawer',
  'window',
  'tab',
  'sheet',
  'popup',
  'overlay',
  'menu',
  'view',
  'ui',
] as const;

const OPEN_VERBS = [
  'open',
  'open the',
  'show me the',
  'go to the',
  'take me to the',
  'pull up the',
  'bring up the',
  'launch the',
  'fire up the',
  'hop into the',
] as const;

const POLITE = ['', 'please ', 'can you ', 'could you ', 'for me '] as const;

function runDispatch(
  text: string,
  session: SessionSlots = emptySession(),
  data: Record<string, unknown> = {
    records: [{ id: 'r1', name: 'Sample Alpha' }],
    events: [{ id: 'e1', name: 'Sample Beta' }],
    hasRecord: false,
    hasEvent: false,
    hasFormat: false,
    hasCenter: false,
  }
) {
  const calls = {
    assistant: [] as string[],
    executed: [] as string[],
  };
  let s = session;
  dispatchUserUtterance({
    text,
    pack,
    session: s,
    ctx: { pathname: '/', data },
    pushAssistant: (msg) => {
      calls.assistant.push(msg);
    },
    executeStep: (stepId) => {
      calls.executed.push(stepId);
    },
    setSession: (updater) => {
      s = updater(s);
    },
  });
  return calls;
}

describe('synonym / surface regression', () => {
  it('create-record + every UI surface still parses to the step', () => {
    const fails: string[] = [];
    for (const surface of SURFACES) {
      for (const verb of ['open the', 'show me the', 'pull up the']) {
        const u = `${verb} create record ${surface}`;
        const parsed = parseUtterance(u, pack);
        if (parsed.stepId !== 'create_record') {
          fails.push(`${u} => ${parsed.stepId}/${parsed.rawIntent}`);
        }
      }
    }
    expect(fails, fails.slice(0, 20).join('\n')).toEqual([]);
  });

  it('create-record + surfaces never become entity-lookup misses', () => {
    const fails: string[] = [];
    for (const surface of SURFACES) {
      for (const verb of OPEN_VERBS) {
        const u = `${verb} create record ${surface}`;
        const lookup = matchEntityLookup(
          u,
          pack.lookups,
          {
            pathname: '/',
            data: { records: [{ id: 'r1', name: 'Sample Alpha' }] },
          },
          TEST_NORMALIZE
        );
        if (lookup.kind === 'miss') {
          fails.push(`${u} => miss(${'query' in lookup ? lookup.query : ''})`);
        }
        const calls = runDispatch(u);
        if (calls.assistant.some((m) => /couldn.t find/i.test(m))) {
          fails.push(`${u} => assistant miss`);
        }
        if (!calls.executed.includes('create_record')) {
          fails.push(`${u} => executed ${calls.executed.join(',') || 'none'}`);
        }
      }
    }
    expect(fails, fails.slice(0, 30).join('\n')).toEqual([]);
  });

  it('create-event and apply-format surface phrasing opens the right step', () => {
    const unlocked = {
      records: [{ id: 'r1', name: 'Sample Alpha' }],
      events: [{ id: 'e1', name: 'Sample Beta' }],
      hasRecord: true,
      hasEvent: true,
      hasFormat: false,
      hasCenter: false,
    };
    const cases: Array<{ u: string; step: string }> = [
      { u: 'open the create event form', step: 'create_event' },
      { u: 'pull up the add event dialog', step: 'create_event' },
      { u: 'show me the event format wizard', step: 'apply_format' },
      { u: 'open the format page', step: 'apply_format' },
      { u: 'take me to the apply format screen', step: 'apply_format' },
      { u: 'bring up create event modal for me', step: 'create_event' },
      { u: 'can you open the create record tab please', step: 'create_record' },
      { u: 'launch the new record wizard', step: 'create_record' },
      { u: 'hop into the create record sheet', step: 'create_record' },
      { u: 'fire up the create record popup', step: 'create_record' },
      { u: 'open create event overlay', step: 'create_event' },
      { u: 'go to the create record menu', step: 'create_record' },
    ];
    const fails: string[] = [];
    for (const c of cases) {
      const parsed = parseUtterance(c.u, pack);
      if (parsed.stepId !== c.step && parsed.rawIntent !== `goto:${c.step}`) {
        fails.push(`parse ${c.u} => ${parsed.stepId}/${parsed.rawIntent}/${parsed.confidence}`);
      }
      const calls = runDispatch(c.u, emptySession(), unlocked);
      if (!calls.executed.includes(c.step)) {
        fails.push(
          `dispatch ${c.u} => want ${c.step}, got ${calls.executed.join(',') || 'none'} / ${calls.assistant[0]?.slice(0, 100)}`
        );
      }
    }
    expect(fails, fails.join('\n')).toEqual([]);
  });

  it('real named entity opens still hit lookup (not create step)', () => {
    const cases = [
      'open the Sample Alpha record',
      'show me Sample Alpha record',
      'go to record Sample Alpha',
      'pull up the Sample Beta event',
    ];
    const fails: string[] = [];
    for (const u of cases) {
      const lookup = matchEntityLookup(
        u,
        pack.lookups,
        {
          pathname: '/',
          data: {
            records: [{ id: 'r1', name: 'Sample Alpha' }],
            events: [{ id: 'e1', name: 'Sample Beta' }],
          },
        },
        TEST_NORMALIZE
      );
      if (lookup.kind !== 'hit') {
        fails.push(`${u} => lookup ${lookup.kind}`);
      }
    }
    expect(fails, fails.join('\n')).toEqual([]);
  });

  it('queued surface discourse opens the queued step', () => {
    const asks = [
      'what form',
      'the form?',
      'which page',
      'where is the dialog',
      'nothing is open',
      "nothing's open",
      'no form is open',
      'what screen',
      'which wizard',
      'the modal isnt open',
      'what tab',
      'which sheet',
      'where is the popup',
      'the overlay is not open',
    ];
    const fails: string[] = [];
    for (const ask of asks) {
      const session: SessionSlots = {
        ...emptySession(),
        actionQueue: [{ stepId: 'create_record', slots: {} }],
      };
      const calls = runDispatch(ask, session);
      if (!calls.executed.includes('create_record')) {
        fails.push(`${ask} => ${calls.executed.join(',') || 'none'} / ${calls.assistant[0]}`);
      }
    }
    expect(fails, fails.join('\n')).toEqual([]);
  });

  it('extractLookupName drops surface + politeness noise', () => {
    for (const polite of POLITE) {
      const q = extractLookupName(
        `${polite}open the create record form for me`.trim(),
        recordLookup,
        TEST_NORMALIZE
      );
      expect(looksLikeStepActionQuery(q ?? ''), String(q)).toBe(true);
    }
  });

  it('format is not destroyed by form synonym stripping', () => {
    expect(parseUtterance('open the event format', pack).stepId).toBe('apply_format');
    expect(parseUtterance('apply format', pack).stepId).toBe('apply_format');
  });
});
