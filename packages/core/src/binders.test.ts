import { describe, expect, it } from 'vitest';
import { bindersToCompleteness, evaluateBinder, normalizeBindersMap } from './binders.js';
import type { BinderPredicate, RuntimeContextBase } from './types.js';

const ctx = (data: Record<string, unknown>): RuntimeContextBase => ({
  pathname: '/demo',
  data,
});

describe('normalizeBindersMap', () => {
  it('converts array binders to a stepId record', () => {
    expect(
      normalizeBindersMap([
        { stepId: 'a', path: 'data.x', op: 'truthy' },
        { stepId: 'b', path: 'data.y', op: 'gte', value: 1 },
      ])
    ).toEqual({
      a: { path: 'data.x', op: 'truthy' },
      b: { path: 'data.y', op: 'gte', value: 1 },
    });
  });

  it('passes through object maps', () => {
    const obj = { a: { path: 'data.x', op: 'truthy' as const } };
    expect(normalizeBindersMap(obj)).toEqual(obj);
  });
});

describe('evaluateBinder', () => {
  it('evaluates path comparisons against ctx.data', () => {
    const pred: BinderPredicate = { path: 'data.listCount', op: 'gte', value: 1 };
    expect(evaluateBinder(pred, ctx({ listCount: 2 }))).toBe(true);
    expect(evaluateBinder(pred, ctx({ listCount: 0 }))).toBe(false);
  });

  it('evaluates all/any groups', () => {
    const pred: BinderPredicate = {
      all: [
        { path: 'data.listCount', op: 'gte', value: 1 },
        { path: 'data.itemCount', op: 'gte', value: 1 },
      ],
    };
    expect(evaluateBinder(pred, ctx({ listCount: 1, itemCount: 2 }))).toBe(true);
    expect(evaluateBinder(pred, ctx({ listCount: 1, itemCount: 0 }))).toBe(false);

    const anyPred: BinderPredicate = {
      any: [
        { path: 'data.ready', op: 'truthy' },
        { path: 'data.listCount', op: 'gte', value: 5 },
      ],
    };
    expect(evaluateBinder(anyPred, ctx({ ready: true, listCount: 0 }))).toBe(true);
  });

  it('supports truthy and falsy ops', () => {
    expect(evaluateBinder({ path: 'data.flag', op: 'truthy' }, ctx({ flag: 'yes' }))).toBe(true);
    expect(evaluateBinder({ path: 'data.flag', op: 'falsy' }, ctx({ flag: '' }))).toBe(true);
  });
});

describe('bindersToCompleteness', () => {
  it('maps binder JSON to per-step completeness fns', () => {
    const fns = bindersToCompleteness({
      add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
    });
    expect(fns.add_item?.(ctx({ itemCount: 1 }))).toBe(true);
    expect(fns.add_item?.(ctx({ itemCount: 0 }))).toBe(false);
  });
});
