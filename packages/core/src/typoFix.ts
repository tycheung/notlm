import { editDistance } from './fuzzyText.js';
import type { IntentParsePack } from './types.js';

/** Common function words — never rewrite these into lexicon hits. */
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'to',
  'of',
  'in',
  'on',
  'for',
  'my',
  'me',
  'i',
  'is',
  'are',
  'be',
  'do',
  'it',
  'and',
  'or',
  'with',
  'from',
  'at',
  'by',
  'up',
  'out',
  'this',
  'that',
  'what',
  'how',
  'when',
  'where',
  'who',
  'can',
  'please',
  'need',
  'want',
  'open',
  'show',
  'go',
  'get',
  'set',
  'make',
  'new',
  'add',
  'edit',
  'check',
  'which',
  'should',
  'have',
  'been',
  'again',
]);

/**
 * Extra tokens allowed when splitting glued words (missing spaces).
 * Includes pronouns / chat shortenings that are not in STOPWORDS (so edit-typo
 * rewrite still skips them).
 */
const GLUE_PARTS = new Set([
  ...STOPWORDS,
  'you',
  'u',
  'your',
  'ur',
  'we',
  'us',
  'they',
  'them',
  'he',
  'she',
  'his',
  'her',
  'im',
  'ive',
  'id',
  'ill',
  'dont',
  'cant',
  'wont',
  'whats',
  'thats',
]);

/**
 * Generic assistant vocabulary always available even before pack aliases load.
 * Keep small — pack lexicon / aliases cover host-specific phrasing.
 */
const BUILTIN_LEXICON = [
  'create',
  'open',
  'show',
  'help',
  'undo',
  'back',
  'next',
  'skip',
  'cancel',
  'submit',
  'save',
  'edit',
  'delete',
  'search',
  'find',
  'list',
  'form',
  'page',
  'screen',
  'wizard',
  'step',
  'checklist',
  'confirm',
  'settings',
  'profile',
  'dashboard',
];

/** Never rewrite these into lexicon hits (greetings / chat cores). */
const PROTECTED_WORDS = new Set([
  ...STOPWORDS,
  'hello',
  'hey',
  'hi',
  'yo',
  'sup',
  'thanks',
  'thank',
  'thx',
  'please',
  'sorry',
  'yes',
  'no',
  'ok',
  'okay',
  // Product plurals that must not collapse into builtin singulars (edits→edit).
  'edits',
  'scores',
  'lanes',
  'squads',
  'reports',
  'centers',
]);

function maxDistance(word: string): number {
  if (word.length >= 8) return 2;
  if (word.length >= 5) return 1;
  // Length ≤4: never rewrite (late≠lane, pass≠past).
  return 0;
}

const BUILTINS_BY_LEN = (() => {
  const m = new Map<number, string[]>();
  for (const builtin of BUILTIN_LEXICON) {
    const row = m.get(builtin.length) ?? [];
    row.push(builtin);
    m.set(builtin.length, row);
  }
  return m;
})();

/** Alias typos like "hellp" must not enter the lexicon and steal "hello"→"help". */
function isNearBuiltinTypo(token: string): boolean {
  for (const len of [token.length - 1, token.length, token.length + 1]) {
    if (len < 3) continue;
    for (const builtin of BUILTINS_BY_LEN.get(len) ?? []) {
      if (token === builtin) return false;
      if (editDistance(token, builtin) === 1) return true;
    }
  }
  return false;
}

function addTokens(lexicon: Set<string>, phrase: string): void {
  const cleaned = phrase
    .toLowerCase()
    .replace(/[^a-z0-9'\s:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return;
  for (const token of cleaned.split(' ')) {
    if (token.length < 3 || STOPWORDS.has(token) || PROTECTED_WORDS.has(token)) continue;
    if (isNearBuiltinTypo(token)) continue;
    lexicon.add(token);
  }
}

/** Build a closed vocabulary from pack titles / keywords / aliases + builtins. */
export function buildTypoLexicon(pack?: IntentParsePack | null): Set<string> {
  const lexicon = new Set<string>(BUILTIN_LEXICON);
  if (!pack) return lexicon;
  for (const step of pack.steps) {
    addTokens(lexicon, step.title);
    for (const kw of step.keywords) addTokens(lexicon, kw);
    for (const alias of pack.aliases[step.id] ?? []) addTokens(lexicon, alias);
  }
  const extra =
    (pack as { lexicon?: string[] }).lexicon ??
    (pack as { normalize?: { lexicon?: string[] } }).normalize?.lexicon;
  if (extra?.length) {
    for (const phrase of extra) addTokens(lexicon, phrase);
  }
  return lexicon;
}

function isGluePart(token: string, lexicon: Set<string>): boolean {
  return token.length >= 2 && (GLUE_PARTS.has(token) || lexicon.has(token));
}

/**
 * Split a missing-space glue token ("youdo", "todolist") into known parts.
 * Only when exactly one bipartition yields two known tokens (lexicon or glue words).
 */
function bestGlueSplit(word: string, lexicon: Set<string>): [string, string] | null {
  if (word.length < 5 || word.length > 28) return null;
  if (lexicon.has(word) || STOPWORDS.has(word)) return null;
  let hit: [string, string] | null = null;
  for (let i = 2; i <= word.length - 2; i += 1) {
    const left = word.slice(0, i);
    const right = word.slice(i);
    if (!isGluePart(left, lexicon) || !isGluePart(right, lexicon)) continue;
    if (hit) return null; // ambiguous
    hit = [left, right];
  }
  return hit;
}

/** Recursively expand glued OOV tokens (handles triple glues like whatcanyoudo). */
function expandGluedToken(word: string, lexicon: Set<string>, depth = 0): string[] {
  if (depth > 4) return [word];
  const split = bestGlueSplit(word, lexicon);
  if (!split) return [word];
  return [
    ...expandGluedToken(split[0], lexicon, depth + 1),
    ...expandGluedToken(split[1], lexicon, depth + 1),
  ];
}

/**
 * Correct OOV tokens against a closed lexicon (edit distance) and split
 * missing-space glues ("what can youdo" → "what can you do").
 * Conservative: unique best match / unique bipartition only; skips stopwords.
 */
export function correctTypos(text: string, lexicon: Set<string>): string {
  if (!text.trim() || lexicon.size === 0) return text;
  const words = text.split(/\s+/);
  let changed = false;
  const out: string[] = [];
  for (const word of words) {
    const expanded = expandGluedToken(word, lexicon);
    if (expanded.length > 1) {
      changed = true;
      out.push(...expanded);
      continue;
    }
    const token = expanded[0]!;
    if (
      PROTECTED_WORDS.has(token) ||
      STOPWORDS.has(token) ||
      lexicon.has(token) ||
      GLUE_PARTS.has(token)
    ) {
      out.push(token);
      continue;
    }
    const max = maxDistance(token);
    if (max <= 0) {
      out.push(token);
      continue;
    }

    let best: string | null = null;
    let bestDist = max + 1;
    let bestLenDelta = Infinity;
    let bestBuiltin = false;
    let tied = false;
    for (const candidate of lexicon) {
      // Cheap length gate before edit distance.
      const lenDelta = Math.abs(candidate.length - token.length);
      if (lenDelta > max) continue;
      const dist = editDistance(token, candidate);
      if (dist > max || dist === 0) continue;
      const isBuiltin = BUILTIN_LEXICON.includes(candidate);
      const better =
        dist < bestDist ||
        (dist === bestDist && isBuiltin && !bestBuiltin) ||
        (dist === bestDist && isBuiltin === bestBuiltin && lenDelta < bestLenDelta);
      if (better) {
        best = candidate;
        bestDist = dist;
        bestLenDelta = lenDelta;
        bestBuiltin = isBuiltin;
        tied = false;
      } else if (
        dist === bestDist &&
        isBuiltin === bestBuiltin &&
        lenDelta === bestLenDelta &&
        candidate !== best
      ) {
        tied = true;
      }
    }
    if (best && !tied) {
      changed = true;
      out.push(best);
    } else {
      out.push(token);
    }
  }
  return changed ? out.join(' ') : text;
}
