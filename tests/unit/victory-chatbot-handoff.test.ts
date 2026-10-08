/**
 * Victory chatbot handoff / Grokbot routing regression (fixture-driven).
 * Exercises generic NotLM gates against real TD utterances + paraphrases.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  isGarbageFallbackReply,
  looksLikeDraftFinish,
  looksLikeInformationalQuestion,
  matchStrongFaqEntry,
  resolveDiscourse,
  type FaqEntry,
} from '../../packages/core/src/index.js';

type ExpectKind =
  | 'strong_faq'
  | 'fallthrough'
  | 'question_not_draft'
  | 'draft_build'
  | 'draft_finish'
  | 'not_choice_index'
  | 'garbage_reply'
  | 'good_reply';

type Case = {
  id: string;
  utterance: string;
  expect: {
    kind: ExpectKind;
    faqId?: string;
    reply?: string;
  };
};

const here = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(here, '../fixtures/victory-chatbot-handoff');
const faq = JSON.parse(
  readFileSync(join(fixtureRoot, 'faq.json'), 'utf8')
) as FaqEntry[];
const { cases } = JSON.parse(
  readFileSync(join(fixtureRoot, 'cases.json'), 'utf8')
) as { cases: Case[] };

describe('victory chatbot handoff fixtures', () => {
  it('loads a non-trivial case set', () => {
    expect(faq.length).toBeGreaterThanOrEqual(15);
    expect(cases.length).toBeGreaterThanOrEqual(80);
  });

  for (const c of cases) {
    it(`${c.id}: ${c.expect.kind}`, () => {
      const u = c.utterance;
      switch (c.expect.kind) {
        case 'strong_faq': {
          const hit = matchStrongFaqEntry(faq, u);
          expect(hit?.id, `expected strong FAQ ${c.expect.faqId}`).toBe(
            c.expect.faqId
          );
          break;
        }
        case 'fallthrough': {
          expect(matchStrongFaqEntry(faq, u)).toBeNull();
          break;
        }
        case 'question_not_draft': {
          expect(looksLikeInformationalQuestion(u)).toBe(true);
          expect(looksLikeDraftFinish(u)).toBe(false);
          break;
        }
        case 'draft_build': {
          expect(looksLikeInformationalQuestion(u)).toBe(false);
          expect(looksLikeDraftFinish(u)).toBe(false);
          break;
        }
        case 'draft_finish': {
          expect(looksLikeDraftFinish(u)).toBe(true);
          break;
        }
        case 'not_choice_index': {
          const d = resolveDiscourse(u, undefined);
          expect(d.kind).not.toBe('choice_index');
          break;
        }
        case 'garbage_reply': {
          expect(isGarbageFallbackReply(c.expect.reply, u)).toBe(true);
          break;
        }
        case 'good_reply': {
          expect(isGarbageFallbackReply(c.expect.reply, u)).toBe(false);
          break;
        }
        default: {
          const _exhaustive: never = c.expect.kind;
          throw new Error(`unknown kind ${_exhaustive}`);
        }
      }
    });
  }
});
