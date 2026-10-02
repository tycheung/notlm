import { looksLikeFaqQuestion } from './glossary.js';
import { normalizeAsk } from './askNormalize.js';
import {
  anyReTest,
  DEFAULT_HEURISTICS,
  type CompiledHeuristics,
} from './heuristics.js';

/**
 * Heuristic: user is asking for explanation / relationship, not requesting navigation.
 * Prevents spurious step queues from token hits on product nouns.
 * Hosts can pass faqDomainTokens so product words are pack-driven.
 */
export function isConceptualQuestion(
  text: string,
  faqDomainTokens?: readonly string[] | null,
  heuristics?: CompiledHeuristics | null
): boolean {
  const h = heuristics ?? DEFAULT_HEURISTICS;
  const t = text.trim();
  if (!t) return false;
  if (/\?\s*$/.test(t) || /\?/.test(t)) return true;
  if (anyReTest(h.conceptual, t)) return true;
  if (!looksLikeFaqQuestion(t, heuristics) || !faqDomainTokens?.length) return false;
  const n = normalizeAsk(t, heuristics);
  return faqDomainTokens.some((tok) => {
    const w = normalizeAsk(tok, heuristics);
    return Boolean(w) && new RegExp(`\\b${escapeRe(w)}\\b`, 'i').test(n);
  });
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
