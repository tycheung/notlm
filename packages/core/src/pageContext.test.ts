import { describe, expect, it } from 'vitest';
import { biasStepByPageContext, pathMatchesStep } from './pageContext.js';
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
    id: 'create_event',
    title: 'Create event',
    keywords: ['event'],
    kind: 'hard',
    requires: [],
  },
];

describe('pathMatchesStep', () => {
  it('matches distinctive path tokens', () => {
    expect(pathMatchesStep('/events/setup', 'create_event')).toBe(true);
    expect(pathMatchesStep('/events/setup', 'create_list')).toBe(false);
  });
});

describe('biasStepByPageContext', () => {
  it('returns an existing stepId unchanged', () => {
    expect(biasStepByPageContext('create_list', '/events', steps)).toBe('create_list');
  });

  it('maps pathname fragments onto a step when stepId is null', () => {
    expect(biasStepByPageContext(null, '/create_event/new', steps)).toBe('create_event');
    expect(biasStepByPageContext(null, '/create-list', steps)).toBe('create_list');
    expect(biasStepByPageContext(null, '/events/setup', steps)).toBe('create_event');
  });

  it('returns null when the path does not hint a step', () => {
    expect(biasStepByPageContext(null, '/home', steps)).toBeNull();
  });
});
