import { describe, expect, it } from 'vitest';
import { getDefaultEventStructurePayload } from '@/constants/defaultEventStructurePayload';

describe('getDefaultEventStructurePayload', () => {
  it('keeps template final nodes structure-only', () => {
    const payload = getDefaultEventStructurePayload();
    const node = payload.final_nodes?.[0] as Record<string, unknown>;
    expect(node).toBeTruthy();
    expect(node).not.toHaveProperty('node_pool_type');
    expect(node).not.toHaveProperty('node_pool_value');
    expect(node).not.toHaveProperty('prize_allocation_steps');
  });
});
