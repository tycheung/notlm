import { describe, expect, it } from 'vitest';
import { AdvancementMethod } from '../../src/types/roundRelationship';
import { relationshipCarryOverUiAllowed } from '../../src/utils/relationshipCarryOverUi';

describe('relationshipCarryOverUiAllowed', () => {
  it('allows eliminator and round_robin sources only', () => {
    expect(relationshipCarryOverUiAllowed(AdvancementMethod.ELIMINATOR)).toBe(true);
    expect(relationshipCarryOverUiAllowed(AdvancementMethod.ROUND_ROBIN)).toBe(true);
    expect(relationshipCarryOverUiAllowed(AdvancementMethod.BRACKET)).toBe(false);
    expect(relationshipCarryOverUiAllowed(AdvancementMethod.STEPLADDER)).toBe(false);
    expect(relationshipCarryOverUiAllowed(AdvancementMethod.PODS)).toBe(false);
  });
});
