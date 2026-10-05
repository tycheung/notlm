import { describe, expect, it } from 'vitest';
import { buildTypoLexicon, correctTypos } from './typoFix.js';
import type { FlowStepDef, IntentParsePack } from './types.js';

const steps: FlowStepDef[] = [
  {
    id: 'create_record',
    title: 'Create record',
    keywords: ['create record', 'new record'],
    kind: 'hard',
    requires: [],
  },
  {
    id: 'enter_metrics',
    title: 'Enter metrics',
    keywords: ['enter metrics', 'metrics'],
    kind: 'hard',
    requires: [],
  },
];

const pack: IntentParsePack = {
  steps,
  aliases: {
    create_record: ['start a record', 'sample record workspace'],
    enter_metrics: ['game metrics'],
  },
  lexicon: [
    'widget',
    'catalog',
    'group',
    'groups',
    'assign',
    'view',
    'views',
  ],
};

describe('buildTypoLexicon', () => {
  it('includes builtins and pack tokens', () => {
    const lex = buildTypoLexicon(pack);
    expect(lex.has('record')).toBe(true);
    expect(lex.has('metrics')).toBe(true);
    expect(lex.has('sample')).toBe(true);
    expect(lex.has('widget')).toBe(true);
    expect(lex.has('the')).toBe(false);
  });

  it('works without a pack (generic builtins only)', () => {
    const lex = buildTypoLexicon(null);
    expect(lex.has('create')).toBe(true);
    expect(lex.has('help')).toBe(true);
    expect(lex.has('group')).toBe(false);
    expect(lex.has('widget')).toBe(false);
  });
});

describe('correctTypos', () => {
  const lex = buildTypoLexicon(pack);

  it('fixes single-character typos against the lexicon', () => {
    expect(correctTypos('create recors', lex)).toBe('create record');
    expect(correctTypos('wdget catalog', lex)).toBe('widget catalog');
    expect(correctTypos('assgn groups', lex)).toBe('assign groups');
  });

  it('leaves stopwords and known words alone', () => {
    expect(correctTypos('create the record', lex)).toBe('create the record');
  });

  it('does not rewrite greetings into alias typos like hellp', () => {
    const dirty = buildTypoLexicon({
      ...pack,
      aliases: {
        ...pack.aliases,
        enter_metrics: ['hellp me open house map view do thing', 'help me start views'],
      },
    });
    expect(dirty.has('hellp')).toBe(false);
    expect(correctTypos('hello', dirty)).toBe('hello');
    expect(correctTypos('hellp', dirty)).toBe('help');
  });

  it('does not rewrite when two lexicon words tie', () => {
    const tiny = new Set(['score', 'scare']);
    expect(correctTypos('scure', tiny)).toBe('scure');
  });

  it('returns empty / unchanged input as-is', () => {
    expect(correctTypos('', lex)).toBe('');
    expect(correctTypos('create record', lex)).toBe('create record');
  });

  it('splits missing-space glues into known tokens', () => {
    expect(correctTypos('what can youdo', lex)).toBe('what can you do');
    expect(correctTypos('what canyou do', lex)).toBe('what can you do');
    expect(correctTypos('widgetcatalog', lex)).toBe('widget catalog');
    expect(correctTypos('creategroup', lex)).toBe('create group');
  });

  it('does not invent ambiguous glue splits', () => {
    // No unique bipartition into known parts → leave alone.
    expect(correctTypos('zzzzzz', lex)).toBe('zzzzzz');
  });
});
