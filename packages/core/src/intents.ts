import { editDistance } from './fuzzyText.js';
import type { IntentParsePack, ParseUtteranceResult, StepId } from './types.js';

const META_PATTERNS: Array<{ intent: string; patterns: RegExp[] }> = [
  {
    intent: 'go_back',
    patterns: [
      /\bgo back\b/i,
      /\bprevious step\b/i,
      /\bearlier step\b/i,
      /\bback up\b/i,
      /\bundo that\b/i,
      /\bwait go back\b/i,
    ],
  },
  {
    intent: 'whats_next',
    patterns: [/\bwhat(?:'s| is) next\b/i, /\bnext step\b/i, /\bwhat should i do\b/i],
  },
  {
    intent: 'explain_field',
    patterns: [/\bexplain\b/i, /\bwhat (?:is|does)\b.+\bmean\b/i, /\bhelp with this field\b/i],
  },
  {
    intent: 'skip_side_actions',
    patterns: [
      /\bskip side actions?\b/i,
      /\bno side actions?\b/i,
      /\bwithout side actions?\b/i,
      /\bskip (?:the )?pots\b/i,
    ],
  },
  {
    intent: 'lookup_participant',
    patterns: [
      /\bwhere is\b/i,
      /\bshow (?:me )?(?:their|his|her) scores\b/i,
      /\bwhat average\b/i,
      /\btheir average\b/i,
    ],
  },
];

const CORRECTION_RE =
  /\b(actually|instead|change(?:\s+it)?|wait|correction|should(?:\s+have)?\s+been|make it|rename(?:\s+it)?|i meant)\b/i;

export function normalizeUtterance(text: string): string {
  let t = text.trim().toLowerCase().replace(/[’']/g, "'");
  t = t.replace(/[^a-z0-9'\s:-]/g, ' ').replace(/\s+/g, ' ').trim();
  const replacements: Array<[RegExp, string]> = [
    [/\btourney\b/g, 'tournament'],
    [/\btornament\b/g, 'tournament'],
    [/\bcreat\b/g, 'create'],
    [/\bcrate\b/g, 'create'],
    [/\bparticpants\b/g, 'participants'],
    [/\bparticiants\b/g, 'participants'],
    [/\blain\b/g, 'lane'],
    [/\blains\b/g, 'lanes'],
    [/\bscors\b/g, 'scores'],
    [/\bsideaction\b/g, 'side action'],
    [/\bside-action\b/g, 'side action'],
    [/\bsubscripshin\b/g, 'subscription'],
    [/\bassgn\b/g, 'assign'],
  ];
  for (const [re, to] of replacements) t = t.replace(re, to);
  return t;
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
  if (!needle) return false;
  if (haystack.includes(needle)) return true;
  const words = haystack.split(' ');
  const needleWords = needle.split(' ');
  if (needleWords.length === 1) {
    const n = needleWords[0];
    if (!n || n.length < 5) return false;
    return words.some((w) => editDistance(w, n) <= 1);
  }
  let from = 0;
  for (const nw of needleWords) {
    let found = -1;
    for (let i = from; i < words.length; i += 1) {
      if (words[i] === nw || (nw.length >= 5 && editDistance(words[i] ?? '', nw) <= 1)) {
        found = i;
        break;
      }
    }
    if (found < 0) return false;
    from = found + 1;
  }
  return true;
}

function phraseScore(haystack: string, phrase: string): number {
  const p = phrase.toLowerCase().trim();
  if (!p) return 0;
  const wordCount = p.split(/\s+/).length;
  const singleWordPenalty = wordCount === 1 ? 220 : 0;
  if (haystack === p) return 1000 + p.length;
  if (haystack.includes(p)) return 500 + p.length * 2 - singleWordPenalty;
  if (fuzzyIncludes(haystack, p)) return 200 + p.length - Math.floor(singleWordPenalty / 2);
  if (haystack.length >= 5 && p.startsWith(haystack)) return 150 + haystack.length;
  return 0;
}

function matchMetaIntent(text: string, enabledMeta?: string[]): string | null {
  for (const meta of META_PATTERNS) {
    if (enabledMeta && !enabledMeta.includes(meta.intent)) continue;
    if (meta.patterns.some((re) => re.test(text))) return meta.intent;
  }
  return null;
}

function matchStep(text: string, pack: IntentParsePack): StepId | null {
  const n = text.includes(' ') || text === text.toLowerCase() ? text : normalizeUtterance(text);
  const haystack = normalizeUtterance(n);
  let best: { id: StepId; score: number } | null = null;

  for (const step of pack.steps) {
    const phrases = [step.title, ...step.keywords, ...(pack.aliases[step.id] || [])];
    for (const phrase of phrases) {
      const score = phraseScore(haystack, phrase);
      if (score <= 0) continue;
      if (!best || score > best.score) best = { id: step.id, score };
    }
  }
  return best?.id ?? null;
}

export function parseUtterance(raw: string, pack: IntentParsePack): ParseUtteranceResult {
  const text = raw.trim();
  if (!text) {
    return {
      stepId: null,
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: null,
    };
  }

  const normalized = normalizeUtterance(text);
  const meta = matchMetaIntent(normalized, pack.meta);
  const goBack = meta === 'go_back';
  const isCorrection = !goBack && CORRECTION_RE.test(normalized);
  const metaBlocksStep =
    goBack ||
    meta === 'whats_next' ||
    meta === 'explain_field' ||
    meta === 'skip_side_actions' ||
    meta === 'lookup_participant';
  let stepId = metaBlocksStep ? null : matchStep(normalized, pack);

  if (isCorrection && stepId) {
    const phrases = [
      ...(pack.steps.find((s) => s.id === stepId)?.keywords ?? []),
      ...(pack.aliases[stepId] || []),
    ];
    const strong = phrases.some(
      (phrase) => phrase.includes(' ') && normalized.includes(phrase.toLowerCase())
    );
    if (!strong && !/\bi meant\b/i.test(normalized)) stepId = null;
  }

  let rawIntent: string | null = null;
  if (goBack) rawIntent = 'go_back';
  else if (meta === 'whats_next') rawIntent = 'whats_next';
  else if (meta === 'explain_field') rawIntent = 'explain_field';
  else if (meta === 'skip_side_actions') rawIntent = 'skip_side_actions';
  else if (meta === 'lookup_participant') rawIntent = 'lookup_participant';
  else if (isCorrection) rawIntent = 'correction';
  else if (stepId) rawIntent = `goto:${stepId}`;
  else rawIntent = 'unknown';

  return {
    stepId,
    slotPatches: {},
    isCorrection,
    goBack,
    rawIntent,
  };
}
