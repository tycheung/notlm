import { describe, expect, it } from 'vitest';
import * as react from '../../packages/react/src/index.ts';

describe('react facade exports (chrome / G10)', () => {
  it('exports appearance helpers and host/provider', () => {
    expect(typeof react.NOTLM_CSS).toBe('string');
    expect(typeof react.appearanceToCssVars).toBe('function');
    expect(typeof react.NotLMHost).toBe('function');
    expect(typeof react.NotLMProvider).toBe('function');
    expect(typeof react.NotLMFab).toBe('function');
    expect(typeof react.useGuideModal).toBe('function');
    expect(typeof react.applyPrefill).toBe('function');
    expect(react).not.toHaveProperty('stubParseUtterance');
    expect(react).not.toHaveProperty('stubHandleUserUtterance');
  });
});
