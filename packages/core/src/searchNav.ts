import type { FlowStepDef, NavSkipEntry, RuntimeContextBase, StepId } from './types.js';

export function searchNavSkips(
  query: string,
  steps: FlowStepDef[],
  ctx: RuntimeContextBase,
  isAvailable: (stepId: StepId, ctx: RuntimeContextBase) => boolean
): NavSkipEntry[] {
  const q = query.trim().toLowerCase();
  return steps
    .filter((step) => {
      for (const rule of step.hideWhen ?? []) {
        if (ctx.data[rule]) return false;
      }
      return isAvailable(step.id, ctx);
    })
    .filter((step) => {
      if (!q) return true;
      if (step.title.toLowerCase().includes(q)) return true;
      return step.keywords.some(
        (keyword) =>
          keyword.toLowerCase().includes(q) || q.includes(keyword.toLowerCase())
      );
    })
    .map((step) => ({ id: step.id, title: step.title, keywords: step.keywords }));
}
