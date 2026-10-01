import { describe, expect, it } from 'vitest';
import {
  normalizeUtterance,
  stripSurfaceNoise,
} from './normalizeConfig.js';
import type { NormalizeConfig } from './types.js';

const cfg: NormalizeConfig = {
  replacements: [{ from: 'tourney', to: 'tournament' }],
  surfaceWords: ['form', 'page', 'wizard', 'screen'],
  trailingFillers: ['for me', 'please', 'now'],
  leadingPoliteness: ['can you', 'could you'],
  openVerbAliases: [{ from: 'pull up', to: 'open' }],
  createVerbAliases: [{ from: 'spin up', to: 'create' }],
};

describe('normalizeUtterance', () => {
  it('applies replacements and open-verb aliases without stripping surfaces', () => {
    expect(normalizeUtterance('pull up the create tourney wizard', cfg)).toBe(
      'open the create tournament wizard'
    );
  });

  it('maps create-verb paraphrases before catalog match', () => {
    expect(normalizeUtterance('spin up a tournament named midnight', cfg)).toBe(
      'create a tournament named midnight'
    );
  });
  it('keeps wizard so next-wizard-step is not collapsed to next-step', () => {
    expect(normalizeUtterance('next wizard step', cfg)).toBe('next wizard step');
  });

  it('strips trailing fillers only at the end', () => {
    expect(normalizeUtterance('open create tournament form for me', cfg)).toBe(
      'open create tournament form'
    );
    expect(normalizeUtterance('what now should i do', cfg)).toBe('what now should i do');
  });

  it('stripSurfaceNoise drops UI nouns for lookup/step variants', () => {
    expect(stripSurfaceNoise('create tournament form', cfg)).toBe('create tournament');
  });
});
