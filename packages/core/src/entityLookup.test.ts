import { describe, expect, it } from 'vitest';
import {
  extractLookupName,
  looksLikeStepActionQuery,
  matchEntityLookup,
} from './entityLookup.js';
import type { LookupDef } from './types.js';

const listsLookup: LookupDef = {
  id: 'lists',
  dataPath: 'lists',
  nameKey: 'name',
  idKey: 'id',
  utteranceHints: ['show me', 'open', 'find', 'go to'],
  entityWords: ['list', 'lists'],
  guideIdTemplate: 'guide-list-row-{{id}}',
};

describe('extractLookupName', () => {
  it('strips hints and entity words', () => {
    expect(extractLookupName('Show me the Shopping list', listsLookup)).toBe('shopping');
  });

  it('strips UI surface synonyms and politeness fillers', () => {
    expect(
      extractLookupName('open the create tournament form for me', {
        ...listsLookup,
        entityWords: ['tournament', 'tournaments'],
      })
    ).toBe('create');
  });
});

describe('looksLikeStepActionQuery', () => {
  it('detects create/goto leftovers', () => {
    expect(looksLikeStepActionQuery('create')).toBe(true);
    expect(looksLikeStepActionQuery('create form for me')).toBe(true);
    expect(looksLikeStepActionQuery('shopping')).toBe(false);
    expect(looksLikeStepActionQuery('E2E Open')).toBe(false);
  });
});

describe('matchEntityLookup', () => {
  const ctx = {
    pathname: '/',
    data: {
      lists: [
        { id: 'list-1', name: 'Shopping' },
        { id: 'list-2', name: 'Work' },
      ],
    },
  };

  it('returns none when utterance is not a lookup', () => {
    expect(matchEntityLookup('hello', [listsLookup], ctx).kind).toBe('none');
  });

  it('hits an exact list name', () => {
    const hit = matchEntityLookup('show me the Shopping list', [listsLookup], ctx);
    expect(hit).toMatchObject({
      kind: 'hit',
      entity: { id: 'list-1', name: 'Shopping', guideId: 'guide-list-row-list-1' },
    });
  });

  it('misses unknown names', () => {
    const miss = matchEntityLookup('show me the Zebra list', [listsLookup], ctx);
    expect(miss.kind).toBe('miss');
  });

  it('does not treat create-step asks as entity misses', () => {
    const tournamentLookup = {
      id: 'tournaments',
      dataPath: 'tournaments',
      nameKey: 'name',
      idKey: 'id',
      utteranceHints: ['show me', 'open', 'find', 'go to'],
      entityWords: ['tournament', 'tournaments'],
    };
    const result = matchEntityLookup(
      'open the create tournament form for me',
      [tournamentLookup],
      {
        pathname: '/',
        data: { tournaments: [{ id: '1', name: 'E2E Open' }] },
      }
    );
    expect(result.kind).toBe('none');
  });

  it('returns ambiguous near-ties', () => {
    const amb = matchEntityLookup(
      'show me the Shop list',
      [listsLookup],
      {
        pathname: '/',
        data: {
          lists: [
            { id: 'a', name: 'Shop' },
            { id: 'b', name: 'Shopping' },
          ],
        },
      }
    );
    expect(amb.kind === 'ambiguous' || amb.kind === 'hit').toBe(true);
  });
});
