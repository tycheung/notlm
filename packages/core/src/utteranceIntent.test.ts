import { describe, expect, it } from 'vitest';
import { isConceptualQuestion } from './utteranceIntent.js';

describe('isConceptualQuestion', () => {
  it('detects tournament/event relationship asks', () => {
    expect(
      isConceptualQuestion(
        'Can you explain how tournaments and events are related to one another'
      )
    ).toBe(true);
    expect(
      isConceptualQuestion(
        "tournaments and events; how do they relate to each other? whats the difference I don't quite understand"
      )
    ).toBe(true);
  });

  it('does not treat bare navigation as conceptual', () => {
    expect(isConceptualQuestion('open create tournament')).toBe(false);
  });

  it('matches pack faqDomainTokens on FAQ-shaped asks', () => {
    expect(isConceptualQuestion('')).toBe(false);
    // Compare-shaped (FAQ) without conceptual short-circuit → domain token path.
    expect(
      isConceptualQuestion('average versus handicap scoring', ['average', 'handicap'])
    ).toBe(true);
    expect(
      isConceptualQuestion('average versus handicap scoring', [
        'totally-unrelated-token',
      ])
    ).toBe(false);
  });
});
