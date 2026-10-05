import { evaluateBinder } from './binders.js';
import type { BinderPredicate, RuntimeContextBase } from './types.js';

export type VisibilityRule = string | BinderPredicate;

function ruleMatches(rule: VisibilityRule, ctx: RuntimeContextBase): boolean {
  if (typeof rule === 'string') {
    return Boolean(ctx.data[rule]);
  }
  return evaluateBinder(rule, ctx);
}

/**
 * Whether a flow step should appear in statuses / palette.
 * - `hideWhen`: hide if any rule matches
 * - `showWhen`: show only if every rule matches (when present)
 */
export function isStepVisible(
  step: { hideWhen?: VisibilityRule[]; showWhen?: VisibilityRule[] },
  ctx: RuntimeContextBase
): boolean {
  for (const rule of step.hideWhen ?? []) {
    if (ruleMatches(rule, ctx)) return false;
  }
  const showWhen = step.showWhen ?? [];
  if (showWhen.length === 0) return true;
  return showWhen.every((rule) => ruleMatches(rule, ctx));
}
