/**
 * Entity-aware OOD / partial-OOD canned replies (no generation).
 */
import { pickReply, renderTemplate } from './replies.js';
import type { ReplyBank, SessionSlots } from './types.js';

const STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'to',
  'of',
  'me',
  'my',
  'you',
  'i',
  'please',
  'can',
  'could',
  'would',
  'make',
  'create',
  'open',
  'show',
  'get',
  'a',
]);

/** Lightweight noun-ish spans for personalizing refuse templates. */
export function extractEntitySpans(text: string): string[] {
  const cleaned = text
    .replace(/[?!.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  const lower = cleaned.toLowerCase();
  const spans: string[] = [];

  const recipe = lower.match(
    /\b(?:a\s+)?recipe\s+for\s+([a-z0-9][\w\s-]{1,40})/i
  );
  if (recipe?.[1]) spans.push(recipe[1].trim());

  const forX = lower.match(/\bfor\s+([a-z0-9][\w\s-]{1,40})$/i);
  if (forX?.[1] && !spans.includes(forX[1].trim())) spans.push(forX[1].trim());

  const tokens = cleaned.split(/\s+/).filter((t) => {
    const w = t.toLowerCase();
    return w.length > 2 && !STOP.has(w);
  });
  if (spans.length === 0 && tokens.length) {
    // Prefer last 2–4 content tokens as a phrase.
    const phrase = tokens.slice(-Math.min(4, tokens.length)).join(' ');
    if (phrase) spans.push(phrase);
  }
  return spans.slice(0, 3);
}

export type OodReplyOpts = {
  productRole?: string;
  capability?: string;
  bank?: ReplyBank;
  session: SessionSlots;
  /** When true, use partial_ood (some segments succeeded). */
  partial?: boolean;
  /** Titles of in-DAG actions that will run. */
  handledTitles?: string[];
};

export function assembleOodReply(
  utterance: string,
  opts: OodReplyOpts
): { text: string; session: SessionSlots; entities: string[] } {
  const entities = extractEntitySpans(utterance);
  const entityStr = entities.length ? entities.join(', ') : 'that';
  const productRole =
    opts.productRole?.trim() ||
    'a bowling tournament guide';
  const capability = opts.capability?.trim() || entityStr;
  const key = opts.partial ? 'repair.partial_ood' : 'repair.ood_capability';
  const picked = pickReply(opts.session, opts.bank, key, {
    entities: entityStr,
    capability,
    product_role: productRole,
    handled: (opts.handledTitles ?? []).join(', '),
  });
  // Ensure defaults render even if bank missing keys — pickReply already merges DEFAULTS.
  const text = renderTemplate(picked.text, {
    entities: entityStr,
    capability,
    product_role: productRole,
    handled: (opts.handledTitles ?? []).join(', '),
  });
  return { text, session: picked.session, entities };
}
