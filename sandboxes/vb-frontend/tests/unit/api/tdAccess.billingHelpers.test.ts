import { describe, expect, it } from 'vitest';
import {
  effectiveMaxAssistants,
  hasElevatingSubscriptionForCreate,
  shouldConfirmPassConsume,
  type TdBillingSummary,
} from '../../../src/api/tdAccess';

function summary(partial: Partial<TdBillingSummary>): TdBillingSummary {
  return {
    subscription: null,
    passes: { tournament: 0, side_action: 0, large_cap_lift: 0 },
    ...partial,
  };
}

describe('billing capability helpers', () => {
  it('confirms pass consume only without elevating sub and with remaining passes', () => {
    expect(shouldConfirmPassConsume(summary({}), 'full')).toEqual({
      confirm: false,
      remaining: 0,
    });
    expect(
      shouldConfirmPassConsume(
        summary({ passes: { tournament: 3, side_action: 0, large_cap_lift: 0 } }),
        'full'
      )
    ).toEqual({ confirm: true, remaining: 3 });
    expect(
      shouldConfirmPassConsume(
        summary({
          subscription: {
            plan: 'monthly',
            status: 'active',
          },
          passes: { tournament: 3, side_action: 0, large_cap_lift: 0 },
        }),
        'full'
      )
    ).toEqual({ confirm: false, remaining: 0 });
  });

  it('treats standard sub as elevating for SA create', () => {
    expect(
      hasElevatingSubscriptionForCreate(
        summary({
          subscription: { plan: 'annual', status: 'active' },
        }),
        'sa'
      )
    ).toBe(true);
    expect(
      hasElevatingSubscriptionForCreate(
        summary({
          subscription: { plan: 'side_action_monthly', status: 'active' },
        }),
        'full'
      )
    ).toBe(false);
  });

  it('maps assistant seat bands from caps', () => {
    expect(effectiveMaxAssistants({ unique_participant_cap: 500 })).toBe(2);
    expect(effectiveMaxAssistants({ unique_participant_cap: 2000 })).toBe(5);
    expect(
      effectiveMaxAssistants({ unique_participant_cap: 5000, max_assistants: 12 })
    ).toBe(12);
  });
});
