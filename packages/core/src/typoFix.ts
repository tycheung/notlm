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
 * Domain + coach vocabulary always available even before pack aliases load.
 * Keep small — pack lexicon covers host-specific phrasing.
 */
const BUILTIN_LEXICON = [
  'tournament',
  'event',
  'squad',
  'squads',
  'lane',
  'lanes',
  'score',
  'scores',
  'scoring',
  'participant',
  'participants',
  'register',
  'registration',
  'billing',
  'subscription',
  'format',
  'prize',
  'payout',
  'report',
  'reports',
  'standings',
  'bowling',
  'center',
  'centre',
  'house',
  'alley',
  'bracket',
  'qualifying',
  'advancement',
  'stepladder',
  'assign',
  'assignment',
  'lock',
  'locked',
  'create',
  'checklist',
  'undo',
  'back',
  'next',
  'help',
  'skip',
  'cancel',
  'submit',
];

function maxDistance(word: string): number {
  if (word.length >= 8) return 2;
  if (word.length >= 5) return 1;
  if (word.length === 4) return 1;
  return 0;
}

function addTokens(lexicon: Set<string>, phrase: string): void {
  const cleaned = phrase
    .toLowerCase()
    .replace(/[^a-z0-9'\s:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return;
  for (const token of cleaned.split(' ')) {
    if (token.length >= 3 && !STOPWORDS.has(token)) lexicon.add(token);
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
  return lexicon;
}

/**
 * Correct OOV tokens against a closed lexicon (edit distance).
 * Conservative: unique best match only; skips stopwords and short tokens.
 */
export function correctTypos(text: string, lexicon: Set<string>): string {
  if (!text.trim() || lexicon.size === 0) return text;
  const words = text.split(/\s+/);
  let changed = false;
  const out = words.map((word) => {
    if (STOPWORDS.has(word) || lexicon.has(word)) return word;
    const max = maxDistance(word);
    if (max <= 0) return word;

    let best: string | null = null;
    let bestDist = max + 1;
    let bestLenDelta = Infinity;
    let tied = false;
    for (const candidate of lexicon) {
      // Cheap length gate before edit distance.
      const lenDelta = Math.abs(candidate.length - word.length);
      if (lenDelta > max) continue;
      const dist = editDistance(word, candidate);
      if (dist > max || dist === 0) continue;
      if (dist < bestDist || (dist === bestDist && lenDelta < bestLenDelta)) {
        best = candidate;
        bestDist = dist;
        bestLenDelta = lenDelta;
        tied = false;
      } else if (dist === bestDist && lenDelta === bestLenDelta && candidate !== best) {
        tied = true;
      }
    }
    if (best && !tied) {
      changed = true;
      return best;
    }
    return word;
  });
  return changed ? out.join(' ') : text;
}
