import { describe, expect, it } from 'vitest';
import {
  isGarbageFallbackReply,
  sanitizeFallbackReply,
} from './fallbackReplySanitize.js';

describe('fallbackReplySanitize', () => {
  it('rejects raw tokens and echoes', () => {
    expect(isGarbageFallbackReply('string')).toBe(true);
    expect(isGarbageFallbackReply('refuse')).toBe(true);
    expect(isGarbageFallbackReply('FAQ')).toBe(true);
    expect(isGarbageFallbackReply('type=refuse')).toBe(true);
    expect(isGarbageFallbackReply('delete it', 'delete it')).toBe(true);
    expect(
      isGarbageFallbackReply(
        'Please provide a text description. I cannot view images.'
      )
    ).toBe(true);
    expect(
      isGarbageFallbackReply(
        'Refuse, I am unable to view images. Please describe the image in your request.'
      )
    ).toBe(true);
  });

  it('keeps real answers', () => {
    expect(sanitizeFallbackReply('Lock squads before scoring.')).toBe(
      'Lock squads before scoring.'
    );
  });
});
