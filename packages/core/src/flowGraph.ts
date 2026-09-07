import type { FlowStepDef, StepId } from './types.js';

/** Steps that list `edited` in requires or prefers (stale fan-out). */
export function dependentStepIds(steps: FlowStepDef[], edited: StepId): StepId[] {
  return steps
    .filter((s) => s.requires.includes(edited) || (s.prefers || []).includes(edited))
    .map((s) => s.id);
}

/** True if requires[] graph contains a cycle. */
export function hasRequiresCycle(steps: FlowStepDef[]): boolean {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const visiting = new Set<StepId>();
  const visited = new Set<StepId>();

  const dfs = (id: StepId): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const step = byId.get(id);
    for (const req of step?.requires ?? []) {
      if (dfs(req)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  for (const s of steps) {
    if (dfs(s.id)) return true;
  }
  return false;
}
