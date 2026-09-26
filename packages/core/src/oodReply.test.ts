import { describe, expect, it } from 'vitest';
import { emptySession } from './slots.js';
import { assembleOodReply, extractEntitySpans } from './oodReply.js';
import { composeMixedIntentReply, parsePackedUtterance } from './packUtterance.js';
import type { IntentParsePack } from './types.js';

const pack: IntentParsePack = {
  steps: [
    {
      id: 'create_event',
      title: 'Create event',
      keywords: ['create event', 'new event'],
      kind: 'hard',
      requires: [],
    },
  ],
  aliases: { create_event: ['create event', 'new event', 'create an event'] },
  meta: [],
};

describe('ood + mixed intent', () => {
  it('extracts house averages from disfluent question', () => {
    expect(extractEntitySpans('uhh what are house averages')).toEqual([
      'house averages',
    ]);
  });

  it('extracts recipe entities', () => {
    expect(extractEntitySpans('recipe for blueberry muffins')).toContain(
      'blueberry muffins'
    );
  });

  it('refuses pure OOD muffins ask', () => {
    const packed = parsePackedUtterance(
      'Can you make me a recipe for blueberry muffins',
      pack
    );
    expect(packed.actions).toHaveLength(0);
    expect(packed.oodSegments.length).toBeGreaterThan(0);
    const reply = composeMixedIntentReply(
      packed,
      pack.steps,
      emptySession(),
      undefined,
      'a bowling tournament guide'
    );
    expect(reply?.text.toLowerCase()).toMatch(/bowling tournament guide/);
    expect(reply?.text.toLowerCase()).toMatch(/muffin/);
  });

  it('handles create event and muffin recipe partially', () => {
    const packed = parsePackedUtterance(
      'Create an event and a recipe for muffins',
      pack
    );
    expect(packed.actions.some((a) => a.stepId === 'create_event')).toBe(true);
    expect(packed.oodSegments.length).toBeGreaterThan(0);
    const reply = composeMixedIntentReply(
      packed,
      pack.steps,
      emptySession(),
      undefined,
      'a bowling tournament guide'
    );
    expect(reply?.text.toLowerCase()).toMatch(/create event|opening/);
    expect(reply?.text.toLowerCase()).toMatch(/muffin|recipe/);
  });

  it('assembleOodReply personalizes entities', () => {
    const { text } = assembleOodReply('make blueberry muffins', {
      session: emptySession(),
      productRole: 'a bowling tournament guide',
    });
    expect(text).toMatch(/bowling tournament guide/);
  });
});
