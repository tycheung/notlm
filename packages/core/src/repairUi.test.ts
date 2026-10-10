import { describe, expect, it, vi } from 'vitest';
import { pushRepairAssistant, shouldDeferRepairUi } from './repairUi.js';

describe('repairUi', () => {
  it('defers unknown when policy on, keeps ambiguous local', () => {
    expect(shouldDeferRepairUi('unknown', { deferDecisionFallbackUi: true })).toBe(true);
    expect(shouldDeferRepairUi('ambiguous', { deferDecisionFallbackUi: true })).toBe(false);
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

  it('never pushes a blank repair bubble', () => {
    const push = vi.fn();
    pushRepairAssistant(
      { pushAssistant: push, deferDecisionFallbackUi: false },
      'unknown',
      '   '
    );
    expect(push).toHaveBeenCalledTimes(1);
    expect(String(push.mock.calls[0]?.[0] ?? '').trim().length).toBeGreaterThan(0);
  });
});
