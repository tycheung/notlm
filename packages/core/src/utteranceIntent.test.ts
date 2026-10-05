import { describe, expect, it } from 'vitest';
import { isConceptualQuestion } from './utteranceIntent.js';

describe('isConceptualQuestion', () => {
  it('detects record/event relationship asks', () => {
    expect(
      isConceptualQuestion(
        'Can you explain how records and events are related to one another'
      )
    ).toBe(true);
    expect(
      isConceptualQuestion(
        "records and events; how do they relate to each other? whats the difference I don't quite understand"
      )
    ).toBe(true);
  });

  it('does not treat bare navigation as conceptual', () => {
    expect(isConceptualQuestion('open create record')).toBe(false);
  });

  it('matches pack faqDomainTokens on FAQ-shaped asks', () => {
    expect(isConceptualQuestion('')).toBe(false);
    // Compare-shaped (FAQ) without conceptual short-circuit → domain token path.
    expect(
      isConceptualQuestion('basic versus premium tier', ['basic', 'premium'])
    ).toBe(true);
    expect(
      isConceptualQuestion('basic versus premium tier', [
        'totally-unrelated-token',
      ])
    ).toBe(false);
  });
});
