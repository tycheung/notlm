import { describe, expect, it } from 'vitest';
import {
  defaultSquadNameForRound,
  formatRoundDisplayLabel,
  isGenericSquadTemplateName,
} from '@/utils/roundDisplayLabel';
import { squadsListFromRoundSpec } from '@/utils/eventStructurePayloadFlow';

describe('roundDisplayLabel', () => {
  it('formats round workspace labels', () => {
    expect(formatRoundDisplayLabel({ round_number: 2, friendly_name: 'Pods' })).toBe(
      'Round 2: Pods'
    );
  });

  it('detects generic template squad names on non-final rounds', () => {
    expect(
      isGenericSquadTemplateName('Final Squad', { round_number: 2, friendly_name: 'Pods' })
    ).toBe(true);
    expect(
      isGenericSquadTemplateName('Final Squad', { round_number: 2, friendly_name: 'Final' })
    ).toBe(false);
    expect(isGenericSquadTemplateName('Morning Squad', { round_number: 2, friendly_name: 'Pods' })).toBe(
      false
    );
  });

  it('defaults squad names from the round label', () => {
    expect(defaultSquadNameForRound({ round_number: 2, friendly_name: 'Pods' })).toBe(
      'Round 2: Pods'
    );
    expect(
      defaultSquadNameForRound(
        { round_number: 2, friendly_name: 'Pods' },
        { templateName: 'Final Squad' }
      )
    ).toBe('Round 2: Pods');
  });
});

describe('squadsListFromRoundSpec', () => {
  it('replaces Final Squad with round-specific names in payloads', () => {
    const list = squadsListFromRoundSpec({
      round_number: 2,
      friendly_name: 'Pods',
      squads: [{ name: 'Final Squad', max_participants: 60 }],
    });
    expect(list).toEqual([{ name: 'Round 2: Pods', max_participants: 60 }]);
  });
});
