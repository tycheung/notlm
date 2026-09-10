import type { FlowStepDef, StepId } from './types.js';

const GENERIC_PATH_TOKENS = new Set([
  'create',
  'add',
  'new',
  'edit',
  'update',
  'set',
  'get',
  'open',
]);

/** Pathname hints that a step id is relevant (id, dashed, or distinctive token). */
export function pathMatchesStep(pathname: string, stepId: StepId): boolean {
  const path = pathname.toLowerCase();
  const id = stepId.toLowerCase();
  if (path.includes(id)) return true;
  const dashed = id.replace(/_/g, '-');
  if (dashed !== id && path.includes(dashed)) return true;
  const slashed = id.replace(/_/g, '/');
  if (slashed !== id && path.includes(slashed)) return true;
  const tokens = id.split('_').filter((t) => t.length >= 3 && !GENERIC_PATH_TOKENS.has(t));
  return tokens.some((t) => path.includes(t));
}

export function biasStepByPageContext(
  stepId: StepId | null,
  pathname: string,
  steps: FlowStepDef[],
  candidates?: StepId[]
): StepId | null {
  if (stepId) return stepId;
  const pool =
    candidates && candidates.length > 0
      ? steps.filter((s) => candidates.includes(s.id))
      : steps;
  for (const step of pool) {
    if (pathMatchesStep(pathname, step.id)) return step.id;
  }
  return null;
}
