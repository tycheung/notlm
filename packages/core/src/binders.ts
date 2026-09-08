import type { BinderPredicate, CompletenessFn, RuntimeContextBase } from './types.js';

type LeafPredicate = Extract<BinderPredicate, { path: string }>;

function resolvePath(ctx: RuntimeContextBase, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = ctx;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function compareNumbers(actual: unknown, expected: unknown, op: 'gt' | 'gte' | 'lt' | 'lte'): boolean {
  if (typeof actual !== 'number' || typeof expected !== 'number') return false;
  switch (op) {
    case 'gt':
      return actual > expected;
    case 'gte':
      return actual >= expected;
    case 'lt':
      return actual < expected;
    case 'lte':
      return actual <= expected;
  }
}

function evaluateLeaf(pred: LeafPredicate, ctx: RuntimeContextBase): boolean {
  const actual = resolvePath(ctx, pred.path);
  switch (pred.op) {
    case 'eq':
      return actual === pred.value;
    case 'neq':
      return actual !== pred.value;
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return compareNumbers(actual, pred.value, pred.op);
    case 'truthy':
      return Boolean(actual);
    case 'falsy':
      return !actual;
    default:
      return false;
  }
}

export function evaluateBinder(pred: BinderPredicate, ctx: RuntimeContextBase): boolean {
  if ('all' in pred) return pred.all.every((child) => evaluateBinder(child, ctx));
  if ('any' in pred) return pred.any.some((child) => evaluateBinder(child, ctx));
  return evaluateLeaf(pred, ctx);
}

export function bindersToCompleteness(
  binders: Record<string, BinderPredicate>
): Record<string, CompletenessFn> {
  const out: Record<string, CompletenessFn> = {};
  for (const [stepId, pred] of Object.entries(binders)) {
    out[stepId] = (ctx) => evaluateBinder(pred, ctx);
  }
  return out;
}
