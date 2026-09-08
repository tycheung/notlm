import { describe, expect, it } from 'vitest';
import { searchNavSkips } from './searchNav.js';
import type { FlowStepDef } from './types.js';

const steps: FlowStepDef[] = [
  {
    id: 'create_list',
    title: 'Create list',
    keywords: ['list'],
    kind: 'hard',
    requires: [],
  },
  {
    id: 'hidden',
    title: 'Hidden',
    keywords: ['secret'],
    kind: 'optional',
    requires: [],
    hideWhen: ['hideSecret'],
  },
];

describe('searchNavSkips', () => {
  it('filters by query and availability', () => {
    const hits = searchNavSkips('list', steps, { pathname: '/', data: {} }, () => true);
    expect(hits.map((h) => h.id)).toEqual(['create_list']);
  });

  it('honors hideWhen against context data', () => {
    const hits = searchNavSkips('', steps, { pathname: '/', data: { hideSecret: true } }, () => true);
    expect(hits.map((h) => h.id)).toEqual(['create_list']);
  });
});
