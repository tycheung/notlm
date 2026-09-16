import { describe, expect, it } from 'vitest';
import { buildTypoLexicon, correctTypos } from './typoFix.js';
import type { FlowStepDef, IntentParsePack } from './types.js';

const steps: FlowStepDef[] = [
  {
    id: 'create_tournament',
    title: 'Create tournament',
    keywords: ['create tournament', 'new tournament'],
    kind: 'hard',
    requires: [],
  },
  {
    id: 'enter_scores',
    title: 'Enter scores',
    keywords: ['enter scores', 'scoring'],
    kind: 'hard',
    requires: [],
  },
];

const pack: IntentParsePack = {
  steps,
  aliases: {
    create_tournament: ['start a tourney', 'sweepers tournament'],
    enter_scores: ['game scoring'],
  },
};

describe('buildTypoLexicon', () => {
  it('includes builtins and pack tokens', () => {
    const lex = buildTypoLexicon(pack);
    expect(lex.has('tournament')).toBe(true);
    expect(lex.has('scoring')).toBe(true);
    expect(lex.has('sweepers')).toBe(true);
    expect(lex.has('the')).toBe(false);
  });

  it('works without a pack', () => {
    const lex = buildTypoLexicon(null);
    expect(lex.has('squad')).toBe(true);
  });
});

describe('correctTypos', () => {
  const lex = buildTypoLexicon(pack);

  it('fixes single-character typos against the lexicon', () => {
    expect(correctTypos('create tornament', lex)).toBe('create tournament');
    expect(correctTypos('bowlng center', lex)).toBe('bowling center');
    expect(correctTypos('assgn squads', lex)).toBe('assign squads');
  });

  it('leaves stopwords and known words alone', () => {
    expect(correctTypos('create the tournament', lex)).toBe('create the tournament');
  });

  it('does not rewrite when two lexicon words tie', () => {
    const tiny = new Set(['score', 'scare']);
    expect(correctTypos('scure', tiny)).toBe('scure');
  });

  it('returns empty / unchanged input as-is', () => {
    expect(correctTypos('', lex)).toBe('');
    expect(correctTypos('create tournament', lex)).toBe('create tournament');
  });
});
