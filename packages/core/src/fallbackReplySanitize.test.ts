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
    expect(isGarbageFallbackReply('create_event')).toBe(true);
    expect(isGarbageFallbackReply('run_reports')).toBe(true);
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
    expect(
      isGarbageFallbackReply(
        'Refuse, this conversation is off-domain and not mappable to the catalog.'
      )
    ).toBe(true);
    expect(
      isGarbageFallbackReply(
        'No — I am a guide, and I do not have the ability to help with Write me a poem about the weather tomorrow.',
        'Write me a poem about the weather tomorrow'
      )
    ).toBe(true);
  });

  it('keeps real answers', () => {
    expect(sanitizeFallbackReply('Lock squads before scoring.')).toBe(
      'Lock squads before scoring.'
    );
  });

  it('strips leaked snake_case step id lines from otherwise good replies', () => {
    expect(
      sanitizeFallbackReply(
        'Regenerate the bracket board.\ncreate_event\nThen lock entries.'
      )
    ).toBe('Regenerate the bracket board.\n\nThen lock entries.');
  });
});
