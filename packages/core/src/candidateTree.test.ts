import { describe, expect, it } from 'vitest';
import { filterCandidatesByContext, shortlistStepIds } from './candidateTree.js';
import { loadPackFromJson } from './loadPack.js';
import { emptySession } from './slots.js';
import type { FlowStepDef } from './types.js';

const flow: FlowStepDef[] = [
  {
    id: 'create_list',
    title: 'Create list',
    keywords: ['list'],
    kind: 'hard',
    requires: [],
  },
  {
    id: 'add_item',
    title: 'Add item',
    keywords: ['item'],
    kind: 'hard',
    requires: ['create_list'],
  },
];

describe('candidateTree', () => {
  const pack = loadPackFromJson({
    manifest: { id: 't' },
    flow,
    controls: [
      { id: 'a', stepId: 'create_list', path: '/lists/create_list' },
      { id: 'b', stepId: 'add_item', path: '/lists/add_item' },
    ],
    intents: { aliases: {} },
    binders: {
      create_list: { path: 'data.listCount', op: 'gte', value: 1 },
      add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
    },
  });

  it('shortlists available incomplete steps and prefers pathname', () => {
    const empty = shortlistStepIds(pack, { pathname: '/', data: {} });
    expect(empty).toEqual(['create_list']);

    const onList = shortlistStepIds(
      pack,
      { pathname: '/lists/create_list', data: { listCount: 0 } },
      []
    );
    expect(onList).toContain('create_list');
  });

  it('filters collision candidates by pathname context', () => {
    const session = emptySession();
    const narrowed = filterCandidatesByContext(
      ['create_list', 'add_item'],
      pack,
      { pathname: '/lists/create_list', data: {} },
      session
    );
    expect(narrowed).toEqual(['create_list']);
  });
});
