import type { PackRuntime, RuntimeContextBase, StepId, StepStatus } from './types.js';

function missingRequires(
  pack: PackRuntime,
  stepId: StepId,
  ctx: RuntimeContextBase,
  stale: Set<StepId>
): string | null {
  const step = pack.steps.find((s) => s.id === stepId);
  if (!step) return 'Unknown step';
  for (const req of step.requires) {
    const complete = pack.isComplete[req]?.(ctx) ?? false;
    if (!complete || stale.has(req)) {
      const title = pack.steps.find((s) => s.id === req)?.title || req;
      return `Complete “${title}” first`;
    }
  }
  return null;
}

export function evaluateFlowStatuses(
  pack: PackRuntime,
  ctx: RuntimeContextBase,
  staleSteps: Iterable<StepId> = []
): StepStatus[] {
  const stale = new Set(staleSteps);
  return pack.steps
    .filter((step) => {
      for (const rule of step.hideWhen || []) {
        if (ctx.data[rule]) return false;
      }
      return true;
    })
    .map((step) => {
      const complete = (pack.isComplete[step.id]?.(ctx) ?? false) && !stale.has(step.id);
      const blockedReason = missingRequires(pack, step.id, ctx, stale);
      const available = blockedReason == null;
      return {
        id: step.id,
        title: step.title,
        kind: step.kind,
        complete,
        available,
        blockedReason: available ? null : blockedReason,
        stale: stale.has(step.id),
      };
    });
}

export function nextAvailableSteps(statuses: StepStatus[]): StepStatus[] {
  return statuses.filter((s) => s.available && !s.complete);
}
