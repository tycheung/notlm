import { describe, expect, it } from 'vitest';
import { useGuideModal } from './useGuideModal.js';

describe('useGuideModal', () => {
  it('exports a hook that manages pending modal keys', () => {
    expect(typeof useGuideModal).toBe('function');
  });
});
