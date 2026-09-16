import { describe, expect, it } from 'vitest';
import { emptySession } from './slots.js';
import {
  activeFlowSteps,
  enterSubgraph,
  exitSubgraph,
  findParentStepForSubgraph,
  getSubgraphSteps,
  isSubgraphComplete,
  maybeCompleteParentSubgraph,
} from './subgraph.js';
import type { FlowStepDef, PackRuntime } from './types.js';

const parent: FlowStepDef = {
  id: 'apply_format',
  title: 'Event format',
  keywords: ['format'],
  kind: 'hard',
  requires: [],
  subgraph: 'event_format',
};

const childHard: FlowStepDef = {
  id: 'pick_rounds',
  title: 'Pick rounds',
  keywords: ['rounds'],
  kind: 'hard',
  requires: [],
};

const childSoft: FlowStepDef = {
  id: 'notes',
  title: 'Notes',
  keywords: ['notes'],
  kind: 'soft',
  requires: [],
};

function packWithSubgraph(children: FlowStepDef[]): PackRuntime {
  return {
    id: 'test',
    steps: [parent],
    isComplete: {},
    resolveNav: () => null,
    subgraphs: { event_format: children },
  };
}

describe('subgraph helpers', () => {
  it('lists subgraph children and finds the parent step', () => {
    const pack = packWithSubgraph([childHard, childSoft]);
    expect(getSubgraphSteps(pack, 'event_format').map((s) => s.id)).toEqual([
      'pick_rounds',
      'notes',
    ]);
    expect(findParentStepForSubgraph(pack, 'event_format')?.id).toBe('apply_format');
    expect(getSubgraphSteps(pack, 'missing')).toEqual([]);
  });

  it('scopes activeFlowSteps while a subgraph is open', () => {
    const pack = packWithSubgraph([childHard]);
    const session = enterSubgraph(emptySession(), 'apply_format', 'event_format');
    expect(activeFlowSteps(pack, session).map((s) => s.id)).toEqual(['pick_rounds']);
    expect(activeFlowSteps(pack, emptySession()).map((s) => s.id)).toEqual(['apply_format']);
  });

  it('falls back to root steps when subgraph id is empty', () => {
    const pack = packWithSubgraph([]);
    const session = {
      ...emptySession(),
      activeSubgraphId: 'event_format',
    };
    expect(activeFlowSteps(pack, session).map((s) => s.id)).toEqual(['apply_format']);
  });

  it('enter/exit maintains the subgraph stack', () => {
    let session = enterSubgraph(emptySession(), 'apply_format', 'event_format');
    expect(session.activeSubgraphId).toBe('event_format');
    expect(session.subgraphStack).toEqual(['apply_format']);
    expect(session.activeStep).toBe('apply_format');

    // Nested enter keeps the outer parent on the stack.
    session = enterSubgraph(session, 'nested_parent', 'event_format');
    expect(session.subgraphStack).toEqual(['apply_format', 'nested_parent']);

    session = exitSubgraph(session);
    expect(session.activeSubgraphId).toBeNull();
    expect(session.subgraphStack).toEqual(['apply_format']);
  });

  it('isSubgraphComplete requires hard children (or all children)', () => {
    const pack = packWithSubgraph([childHard, childSoft]);
    expect(isSubgraphComplete(pack, 'event_format', () => false)).toBe(false);
    expect(isSubgraphComplete(pack, 'event_format', (id) => id === 'pick_rounds')).toBe(true);
    expect(isSubgraphComplete(pack, 'missing', () => true)).toBe(false);

    const softOnly = packWithSubgraph([childSoft]);
    expect(isSubgraphComplete(softOnly, 'event_format', (id) => id === 'notes')).toBe(true);
  });

  it('maybeCompleteParentSubgraph exits when hard children are done', () => {
    const pack = packWithSubgraph([childHard, childSoft]);
    const session = {
      ...enterSubgraph(emptySession(), 'apply_format', 'event_format'),
      history: ['pick_rounds'],
    };
    const done = maybeCompleteParentSubgraph(pack, session, 'pick_rounds');
    expect(done.completedParent).toBe('apply_format');
    expect(done.session.activeSubgraphId).toBeNull();

    const unrelated = maybeCompleteParentSubgraph(pack, session, 'notes');
    // soft child alone does not finish hard requirement unless hard is complete
    expect(unrelated.completedParent).toBe('apply_format');

    const idle = maybeCompleteParentSubgraph(pack, emptySession(), 'pick_rounds');
    expect(idle.completedParent).toBeNull();

    const wrongChild = maybeCompleteParentSubgraph(
      pack,
      enterSubgraph(emptySession(), 'apply_format', 'event_format'),
      'unknown_step'
    );
    expect(wrongChild.completedParent).toBeNull();
  });
});
