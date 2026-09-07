import { describe, expect, it } from 'vitest';
import { hasRequiresCycle, dependentStepIds } from '../../packages/core/src/flowGraph.ts';
import type { FlowStepDef } from '../../packages/core/src/types.ts';

describe('architecture bootstrap', () => {
  it('detects requires cycles', () => {
    const steps: FlowStepDef[] = [
      { id: 'a', title: 'A', keywords: [], kind: 'hard', requires: ['b'] },
      { id: 'b', title: 'B', keywords: [], kind: 'hard', requires: ['a'] },
    ];
    expect(hasRequiresCycle(steps)).toBe(true);
  });

  it('lists dependents for stale fan-out', () => {
    const steps: FlowStepDef[] = [
      { id: 'a', title: 'A', keywords: [], kind: 'hard', requires: [] },
      { id: 'b', title: 'B', keywords: [], kind: 'hard', requires: ['a'] },
    ];
    expect(dependentStepIds(steps, 'a')).toEqual(['b']);
  });
});
