/**
 * Entity-aware OOD / partial-OOD canned replies (no generation).
 * Stopwords / disfluency / question frames come from pack heuristics.
 */
import {
  DEFAULT_HEURISTICS,
  type CompiledHeuristics,
} from './heuristics.js';
import { pickReply, renderTemplate } from './replies.js';
import type { ReplyBank, SessionSlots } from './types.js';

function resolveH(h?: CompiledHeuristics | null): CompiledHeuristics {
  return h ?? DEFAULT_HEURISTICS;
}

/** Lightweight noun-ish spans for personalizing refuse templates. */
export function extractEntitySpans(
  text: string,
  heuristics?: CompiledHeuristics | null
): string[] {
  const h = resolveH(heuristics);
  let cleaned = text
    .replace(/[?!.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];

  // Strip leading disfluencies repeatedly, then question frames.
  for (let i = 0; i < 3; i++) {
    let next = cleaned;
    if (h.askDisfluencyLead) next = next.replace(h.askDisfluencyLead, '').trim();
    if (next === cleaned) break;
    cleaned = next;
  }
  for (const frame of h.oodQuestionFrames) {
    cleaned = cleaned.replace(frame, '').trim();
  }

  const stop = h.oodStopwords;
  const lower = cleaned.toLowerCase();
  const spans: string[] = [];

  const recipe = lower.match(
    /\b(?:a\s+)?recipe\s+for\s+([a-z0-9][\w\s-]{1,40})/i
  );
  if (recipe?.[1]) spans.push(recipe[1].trim());

  const forX = lower.match(/\bfor\s+([a-z0-9][\w\s-]{1,40})$/i);
  if (forX?.[1] && !spans.includes(forX[1].trim())) spans.push(forX[1].trim());

  // Prefer multi-word noun phrase remaining after frame strip (e.g. "house averages").
  const content = cleaned
    .split(/\s+/)
    .filter((t) => {
      const w = t.toLowerCase();
      return w.length > 1 && !stop.has(w);
    })
    .join(' ')
    .trim();
  if (content && !spans.includes(content)) {
    // Cap length so we never regurgitate a whole sentence.
    const short =
      content.length > 48 ? content.split(/\s+/).slice(0, 4).join(' ') : content;
    if (short) spans.push(short);
  }

  if (spans.length === 0) {
    const tokens = cleaned.split(/\s+/).filter((t) => {
      const w = t.toLowerCase();
      return w.length > 2 && !stop.has(w);
    });
    if (tokens.length) {
      const phrase = tokens.slice(-Math.min(3, tokens.length)).join(' ');
      if (phrase) spans.push(phrase);
    }
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
  heuristics?: CompiledHeuristics | null;
};

export function assembleOodReply(
  utterance: string,
  opts: OodReplyOpts
): { text: string; session: SessionSlots; entities: string[] } {
  const entities = extractEntitySpans(utterance, opts.heuristics);
  // Prefer a short neutral label so refuse copy never pastes the user utterance.
  const entityStr = 'that request';
  const productRole = opts.productRole?.trim() || 'a product assistant';
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
