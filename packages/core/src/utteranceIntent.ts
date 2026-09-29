import { looksLikeFaqQuestion } from './glossary.js';

/**
 * Heuristic: user is asking for explanation / relationship, not requesting navigation.
 * Prevents spurious step queues from token hits on "tournament", "event", etc.
 */
export function isConceptualQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/\?\s*$/.test(t) || /\?/.test(t)) return true;
  return (
    /^(can you )?(explain|tell me|describe|clarify)\b/i.test(t) ||
    /\bhow (do|does|are|is|to|can)\b/i.test(t) ||
    /\bwhat('s| is| are) (the )?(difference|relationship)\b/i.test(t) ||
    /\b(relate(d)? (to|each)|relationship between)\b/i.test(t) ||
    /\bdifference between\b/i.test(t) ||
    (looksLikeFaqQuestion(t) && /\b(tournament|event|squad|round|format)\b/i.test(t))
  );
}
