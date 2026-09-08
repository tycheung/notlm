import { describe, expect, it } from 'vitest';

import { normalizePatchPayload } from '@/api/payloadNormalization';

describe('normalizePatchPayload', () => {
  it('omits undefined keys from patch payloads', () => {
    const payload = normalizePatchPayload({
      source_round_id: 1,
      target_round_id: undefined,
      final_node_id: null,
    });

    expect(payload).toEqual({
      source_round_id: 1,
      final_node_id: null,
    });
    expect('target_round_id' in payload).toBe(false);
  });

  it('preserves explicit clear values (null and 0)', () => {
    const payload = normalizePatchPayload({
      advancement_count: 0,
      advancement_percentage: 0,
      min_advancement_count: null,
      description: '',
    });

    expect(payload).toEqual({
      advancement_count: 0,
      advancement_percentage: 0,
      min_advancement_count: null,
      description: '',
    });
  });
});
