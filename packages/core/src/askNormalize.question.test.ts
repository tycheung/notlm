import { describe, expect, it } from 'vitest';
import {
  looksLikeDraftFinish,
  looksLikeInformationalQuestion,
} from './askNormalize.js';

describe('informational question vs draft finish', () => {
  it('flags rule questions', () => {
    expect(
      looksLikeInformationalQuestion('Who decides a tie in the stepladder finals?')
    ).toBe(true);
    expect(
      looksLikeInformationalQuestion('How is bracket handicap calculated?')
    ).toBe(true);
    expect(looksLikeInformationalQuestion('Does Max 300 apply in finals?')).toBe(
      true
    );
  });

  it('allows explicit builds and finish', () => {
    expect(
      looksLikeInformationalQuestion('Add a qualifying round with 3 games')
    ).toBe(false);
    expect(looksLikeDraftFinish("that's it")).toBe(true);
    expect(looksLikeDraftFinish('save the format')).toBe(true);
    expect(looksLikeDraftFinish("I'm done")).toBe(true);
    expect(looksLikeDraftFinish('done')).toBe(true);
  });

  it('does not treat “how is X done?” as draft finish', () => {
    expect(looksLikeDraftFinish('how is handicap rounding done?')).toBe(false);
    expect(looksLikeDraftFinish('How is bracket handicap calculated?')).toBe(
      false
    );
  });
});
