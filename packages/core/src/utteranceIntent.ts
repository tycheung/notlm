import { looksLikeFaqQuestion } from './glossary.js';
import { normalizeAsk } from './askNormalize.js';

/**
 * Heuristic: user is asking for explanation / relationship, not requesting navigation.
 * Prevents spurious step queues from token hits on product nouns.
 * Hosts can pass faqDomainTokens so product words are pack-driven.
 */
export function isConceptualQuestion(
  text: string,
  faqDomainTokens?: readonly string[] | null
): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/\?\s*$/.test(t) || /\?/.test(t)) return true;
  if (
    /^(can you )?(explain|tell me|describe|clarify)\b/i.test(t) ||
    /\bhow (do|does|are|is|to|can)\b/i.test(t) ||
    /\bwhat('s| is| are) (the )?(difference|relationship)\b/i.test(t) ||
    /\b(relate(d)? (to|each)|relationship between)\b/i.test(t) ||
    /\bdifference between\b/i.test(t)
  ) {
    return true;
  }
  if (!looksLikeFaqQuestion(t) || !faqDomainTokens?.length) return false;
  const n = normalizeAsk(t);
  return faqDomainTokens.some((tok) => {
    const w = normalizeAsk(tok);
    return Boolean(w) && new RegExp(`\\b${escapeRe(w)}\\b`, 'i').test(n);
  });
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
