import { describe, expect, it } from 'vitest';
import {
  normalizeUtterance,
  stripSurfaceNoise,
} from './normalizeConfig.js';
import type { NormalizeConfig } from './types.js';

const cfg: NormalizeConfig = {
  replacements: [{ from: 'recrod', to: 'record' }],
  surfaceWords: ['form', 'page', 'wizard', 'screen'],
  trailingFillers: ['for me', 'please', 'now'],
  leadingPoliteness: ['can you', 'could you'],
  openVerbAliases: [{ from: 'pull up', to: 'open' }],
  createVerbAliases: [{ from: 'spin up', to: 'create' }],
};

describe('normalizeUtterance', () => {
  it('applies replacements and open-verb aliases without stripping surfaces', () => {
    expect(normalizeUtterance('pull up the create recrod wizard', cfg)).toBe(
      'open the create record wizard'
    );
  });

  it('maps create-verb paraphrases after open verbs', () => {
    expect(normalizeUtterance('spin up a record named midnight', cfg)).toBe(
      'create a record named midnight'
    );
    // open first, then create — "launch event" can become create via pack create aliases
    const launchCfg: NormalizeConfig = {
      openVerbAliases: [{ from: 'launch', to: 'open' }],
      createVerbAliases: [{ from: 'open event', to: 'create event' }],
    };
    expect(normalizeUtterance('launch event', launchCfg)).toBe('create event');
  });
  it('keeps wizard so next-wizard-step is not collapsed to next-step', () => {
    expect(normalizeUtterance('next wizard step', cfg)).toBe('next wizard step');
  });

  it('strips trailing fillers only at the end', () => {
    expect(normalizeUtterance('open create record form for me', cfg)).toBe(
      'open create record form'
    );
    expect(normalizeUtterance('what now should i do', cfg)).toBe('what now should i do');
  });

  it('expands path-style hyphens and underscores into spaces', () => {
    expect(normalizeUtterance('open enter-metrics', cfg)).toBe('open enter metrics');
    expect(normalizeUtterance('show actions-needed queue', cfg)).toBe(
      'show actions needed queue'
    );
    expect(normalizeUtterance('open create_event', cfg)).toBe('open create event');
  });

  it('stripSurfaceNoise drops UI nouns for lookup/step variants', () => {
    expect(stripSurfaceNoise('create record form', cfg)).toBe('create record');
  });
});
