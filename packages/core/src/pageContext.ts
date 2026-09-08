import type { FlowStepDef, StepId } from './types.js';

export function biasStepByPageContext(
  stepId: StepId | null,
  pathname: string,
  steps: FlowStepDef[]
): StepId | null {
  if (stepId) return stepId;
  const path = pathname.toLowerCase();
  for (const step of steps) {
    const id = step.id.toLowerCase();
    if (path.includes(id)) return step.id;
    const dashed = id.replace(/_/g, '-');
    if (dashed !== id && path.includes(dashed)) return step.id;
    const slashed = id.replace(/_/g, '/');
    if (slashed !== id && path.includes(slashed)) return step.id;
  }
  return null;
}
