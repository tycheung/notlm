/**
 * Shared utterance normalization for FAQ / catalog / discourse matching.
 * Strips disfluency + polite frames, then exposes content-token helpers so
 * "fix the temporary usbc please" can hit "fix temporary usbc".
 */

const DISFLUENCY_LEAD =
  /^(uhh?|umm?|er|ah|like|so|well|okay|ok|hey|yo|pls|please|can you|could you|would you|will you)\s+/;

const POLITE_TRAIL = /\s+(please|pls|thanks|thank you|thx)$/;

/** Light stopwords ignored when scoring alias content coverage. */
const CONTENT_STOP = new Set([
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
  'pls',
  'can',
  'could',
  'would',
  'should',
  'will',
  'with',
  'about',
  'from',
  'this',
  'that',
  'in',
  'on',
  'at',
  'be',
  'is',
  'are',
  'do',
  'does',
  'did',
  'a',
  'vs',
  'versus',
  'compared',
]);

export function normalizeAsk(utterance: string): string {
  let n = utterance
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < 4; i++) {
    const next = n.replace(DISFLUENCY_LEAD, '').replace(POLITE_TRAIL, '').trim();
    if (next === n) break;
    n = next;
  }
  return n;
}

/** Content tokens for coverage scoring (stopwords removed). */
export function contentTokens(text: string): string[] {
  return normalizeAsk(text)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !CONTENT_STOP.has(t));
}

/**
 * Fraction of `label` content tokens that appear as an ordered subsequence
 * in `needle` content tokens. 1 = full coverage.
 */
export function aliasContentCoverage(needle: string, label: string): number {
  const hay = contentTokens(needle);
  const need = contentTokens(label);
  if (!need.length || !hay.length) return 0;
  let from = 0;
  let hit = 0;
  for (const tok of need) {
    let found = -1;
    for (let i = from; i < hay.length; i++) {
      if (hay[i] === tok) {
        found = i;
        break;
      }
    }
    if (found < 0) continue;
    hit += 1;
    from = found + 1;
  }
  return hit / need.length;
}

/** Bag-of-words coverage (order-insensitive) for paraphrase FAQ/compare asks. */
export function aliasContentCoverageBagable(needle: string, label: string): number {
  const hay = new Set(contentTokens(needle));
  const need = contentTokens(label);
  if (!need.length || !hay.size) return 0;
  let hit = 0;
  for (const tok of need) {
    if (hay.has(tok)) hit += 1;
  }
  return hit / need.length;
}

/** Best of ordered + bag-of-words when the label is multi-token. */
export function bestAliasContentCoverage(needle: string, label: string): number {
  const ordered = aliasContentCoverage(needle, label);
  const labelToks = contentTokens(label);
  if (labelToks.length < 3) return ordered;
  return Math.max(ordered, aliasContentCoverageBagable(needle, label));
}

/**
 * Clear out-of-domain asks that System One should refuse locally (never Laya goto).
 * Keep this conservative — bowling product questions must stay false.
 */
export function looksLikeClearOod(utterance: string): boolean {
  const n = normalizeAsk(utterance);
  if (!n) return false;
  if (
    /\b(bake|baking|recipe|roast|chicken|apple pie|pie|joke|poem|cats?|capital of|world series|politics|movie|film|tonight|2\s*\+\s*2|math problem|xyzzy|plugh|nonsense|gibberish|sonnet|limerick|haiku|sourdough|paperclip|tungsten|parallel park|podcast|mocktail|klingon|merge sort|crypto|tariffs?|iphone)\b/.test(
      n
    )
  ) {
    return true;
  }
  if (/\bforget bowling\b/.test(n) || /\bignore bowling\b/.test(n)) return true;
  if (/\brecommend a (movie|film|show|documentary|podcast)\b/.test(n)) return true;
  if (/\bsuggest a (documentary|mocktail|cocktail)\b/.test(n)) return true;
  if (/\bsolve\b.+\b(in depth|for me)\b/.test(n)) return true;
  if (/\bwrite me a poem\b/.test(n) || /\binvent a limerick\b/.test(n)) return true;
  if (/\bdraft a haiku\b/.test(n) || /\btell me a joke\b/.test(n)) return true;
  if (/\bcompose a (sonnet|limerick)\b/.test(n)) return true;
  if (/\bfitted sheet\b/.test(n) || /\bcaramelize\b/.test(n) || /\bonions\b/.test(n)) {
    return true;
  }
  if (/\bboiling point\b/.test(n) || /\bmelting point\b/.test(n) || /\bfactorial\b/.test(n)) {
    return true;
  }
  if (/\binvented the (zipper|paperclip)\b/.test(n) || /\bmoon landing\b/.test(n)) {
    return true;
  }
  if (/\bdebate taxes\b/.test(n) || /\bargue tariffs\b/.test(n) || /\bstock market\b/.test(n)) {
    return true;
  }
  if (/\bforecast tomorrow\b/.test(n) || /\bbubble sort\b/.test(n) || /\bmerge sort\b/.test(n)) {
    return true;
  }
  if (/\bklingon\b/.test(n) || /\bcocktail recipe\b/.test(n) || /\bmocktail\b/.test(n)) {
    return true;
  }
  if (/\bcompute\s+\d+\b/.test(n) || /\bpredict next week\b/.test(n)) return true;
  if (/\bproof sourdough\b/.test(n) || /\bparallel park\b/.test(n)) return true;
  return false;
}
