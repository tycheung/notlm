/**
 * Pack-driven utterance normalization.
 * Mechanisms live in core; synonym / surface / open-verb lists live in pack JSON.
 */
import type { NormalizeConfig, NormalizePhrasePair } from './types.js';

export type { NormalizeConfig, NormalizePhrasePair };

export function emptyNormalizeConfig(): NormalizeConfig {
  return {};
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function phraseBoundaryRe(phrase: string, flags = 'gi'): RegExp {
  const parts = phrase.trim().split(/\s+/).map(escapeRe);
  return new RegExp(`\\b${parts.join('\\s+')}\\b`, flags);
}

function stripPhrases(text: string, phrases: string[] | undefined): string {
  if (!phrases?.length) return text;
  let t = text;
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    if (!p.trim()) continue;
    t = t.replace(phraseBoundaryRe(p), ' ');
  }
  return t;
}

function applyPairs(text: string, pairs: NormalizePhrasePair[] | undefined): string {
  if (!pairs?.length) return text;
  let t = text;
  const sorted = [...pairs].sort((a, b) => b.from.length - a.from.length);
  for (const { from, to } of sorted) {
    if (!from.trim()) continue;
    t = t.replace(phraseBoundaryRe(from), to);
  }
  return t;
}

function stripLeadingPhrases(text: string, phrases: string[] | undefined): string {
  if (!phrases?.length) return text;
  let t = text;
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    if (!p.trim()) continue;
    const re = new RegExp(`^(?:${escapeRe(p).replace(/\s+/g, '\\s+')})\\s+`, 'i');
    t = t.replace(re, '');
  }
  return t;
}

/**
 * Normalize an utterance using pack `normalize` config.
 * When config is omitted/empty, only basic cleanup runs (no domain synonyms).
 */
export function normalizeUtterance(text: string, config?: NormalizeConfig | null): string {
  let t = text.trim().toLowerCase().replace(/[’']/g, "'");
  t = t.replace(/[^a-z0-9'\s:-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!config) return t;

  t = applyPairs(t, config.replacements);
  t = applyPairs(t, config.openVerbAliases);
  t = stripPhrases(t, config.surfaceWords);
  t = stripPhrases(t, config.trailingFillers);
  t = stripLeadingPhrases(t, config.leadingPoliteness);
  return t.replace(/\s+/g, ' ').trim();
}

/** Haystack variant with leading open-verb prefixes removed (for step scoring). */
export function stripOpenVerbPrefix(
  haystack: string,
  config?: NormalizeConfig | null
): string {
  const prefixes = config?.openVerbPrefixes ?? [];
  if (!prefixes.length) return haystack;
  const sorted = [...prefixes].sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    const re = new RegExp(
      `^(?:${escapeRe(p).replace(/\s+/g, '\\s+')})\\s+(?:the\\s+)?`,
      'i'
    );
    if (re.test(haystack)) {
      return haystack.replace(re, '').trim();
    }
  }
  return haystack;
}

/** Build a surface-ask detector from pack surface words. */
export function looksLikeSurfaceAsk(
  text: string,
  config?: NormalizeConfig | null
): boolean {
  const surfaces = config?.surfaceWords ?? [];
  if (surfaces.length) {
    const alt = surfaces.map(escapeRe).join('|');
    const re = new RegExp(
      `\\b(?:what|which|where(?:'s| is)|whose)?\\s*(?:the\\s+)?(?:${alt})\\b`,
      'i'
    );
    if (re.test(text)) return true;
  }
  return /\b(?:nothing(?:'s| is)?\s+open|(?:isn'?t|not)\s+open)\b/i.test(text);
}
