import { describe, expect, it, vi } from 'vitest';
import { pushRepairAssistant, shouldDeferRepairUi } from './repairUi.js';

describe('repairUi', () => {
  it('defers unknown/ambiguous when policy on', () => {
    expect(shouldDeferRepairUi('unknown', { deferDecisionFallbackUi: true })).toBe(true);
    expect(shouldDeferRepairUi('ambiguous', { deferDecisionFallbackUi: true })).toBe(true);
    expect(shouldDeferRepairUi('low_confidence', { deferDecisionFallbackUi: true })).toBe(
      false
    );
    expect(
      shouldDeferRepairUi(
        'low_confidence',
        { deferDecisionFallbackUi: true },
        { includeLowConfidence: true }
      )
    ).toBe(true);
  });

  it('skips pushAssistant when deferred', () => {
    const push = vi.fn();
    pushRepairAssistant(
      { pushAssistant: push, deferDecisionFallbackUi: true },
      'unknown',
      'canned'
    );
    expect(push).not.toHaveBeenCalled();
    pushRepairAssistant(
      { pushAssistant: push, deferDecisionFallbackUi: false },
      'unknown',
      'canned'
    );
    expect(push).toHaveBeenCalledWith('canned', undefined);
  });
});
