import { describe, expect, it } from 'vitest';
import { resolveDiscourse } from './discourse.js';
import { compileHeuristics } from './heuristics.js';
import { parseUtterance } from './intents.js';
import { loadPackFromJson } from './loadPack.js';
import type { FlowStepDef } from './types.js';

const flow: FlowStepDef[] = [
  {
    id: 'create_list',
    title: 'Create list',
    keywords: ['create list'],
    kind: 'hard',
    requires: [],
  },
  {
    id: 'add_item',
    title: 'Add item',
    keywords: ['add item'],
    kind: 'hard',
    requires: ['create_list'],
  },
];

/** Host-product fillers from pack heuristics / normalize, not core defaults. */
const hostH = compileHeuristics({
  discourse: {
    leadFillers: ['desk', 'crew', 'staff', 'floor'],
    trailFillers: ['in app', 'on the desk', 'on desk', 'for crew'],
  },
});

describe('discourse repair', () => {
  it('detects change-the-name repair', () => {
    const r = resolveDiscourse('change the name', { lastStepId: 'create_list' });
    expect(r.kind).toBe('repair_slot');
  });

  it('extracts rename target', () => {
    const r = resolveDiscourse('rename to Errands', { lastStepId: 'create_list' });
    expect(r.kind).toBe('repair_slot');
    if (r.kind === 'repair_slot') expect(r.slotHint).toMatch(/Errands/i);
  });

  it('detects undo without stealing go back meta', () => {
    expect(resolveDiscourse('undo that', {}).kind).toBe('undo');
    expect(resolveDiscourse('hey nevermind', {}).kind).toBe('undo');
    expect(resolveDiscourse('cancel this', {}).kind).toBe('undo');
    expect(resolveDiscourse('never mind that', {}).kind).toBe('undo');
    expect(resolveDiscourse('cancel that choice', {}).kind).toBe('undo');
    expect(resolveDiscourse('nevermind that pick', {}).kind).toBe('undo');
    expect(resolveDiscourse('never mind that selection', {}).kind).toBe('undo');
    expect(resolveDiscourse('go back', {}).kind).toBe('none');
  });

  it('detects meant-the-other as clarify or alternate choice', () => {
    expect(resolveDiscourse('I meant the other project', {}).kind).toBe('clarify_choice');
    expect(
      resolveDiscourse('meant the alternate shell', { lastChoiceIds: ['a', 'b'] }).kind
    ).toBe('step');
    expect(
      resolveDiscourse('meant the alternate project shell', {
        lastChoiceIds: ['a', 'b'],
      }).kind
    ).toBe('step');
    expect(
      resolveDiscourse(
        'please meant the alternate project shell in app',
        { lastChoiceIds: ['a', 'b'] },
        hostH
      ).kind
    ).toBe('step');
  });

  it('clarifies other-one / number without prior choices', () => {
    expect(resolveDiscourse('the other one', {}).kind).toBe('clarify_choice');
    expect(resolveDiscourse('the other option', {}).kind).toBe('clarify_choice');
    expect(resolveDiscourse('the other one on the desk', {}, hostH).kind).toBe(
      'clarify_choice'
    );
    expect(resolveDiscourse('nevermind in app', {}, hostH).kind).toBe('undo');
    expect(resolveDiscourse('quick nevermind', {}).kind).toBe('undo');
    expect(resolveDiscourse('desk nevermind', {}, hostH).kind).toBe('undo');
    expect(resolveDiscourse('the other one if possible', {}).kind).toBe('clarify_choice');
    expect(resolveDiscourse('number 2', {}).kind).toBe('choice_index');
    expect(resolveDiscourse('pick the second one', {}).kind).toBe('choice_index');
    expect(resolveDiscourse('pick the second one briefly', { lastChoiceIds: ['a', 'b'] }).kind).toBe(
      'step'
    );
    expect(resolveDiscourse('pick number 2', { lastChoiceIds: ['a', 'b'] }).kind).toBe(
      'step'
    );
    expect(
      resolveDiscourse('number 2', { lastChoiceIds: ['a', 'b'] }).kind
    ).toBe('step');
  });
});

describe('parse confidence', () => {
  it('marks exact alias hits as high confidence', () => {
    const pack = loadPackFromJson({
      manifest: { id: 'c' },
      flow,
      controls: [{ id: 'a', stepId: 'create_list', path: '/a' }],
      intents: { aliases: { create_list: ['create list'], add_item: ['add item'] }, meta: [] },
      binders: {
        create_list: { path: 'data.listCount', op: 'gte', value: 1 },
        add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
      },
    });
    const r = parseUtterance('create list', {
      steps: pack.steps,
      aliases: pack.aliases,
      meta: pack.meta,
    });
    expect(r.stepId).toBe('create_list');
    expect(r.confidence).toBe('high');
  });
});
