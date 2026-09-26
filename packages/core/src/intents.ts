import { editDistance, hasTokenBoundaryMatch } from './fuzzyText.js';
import {
  probabilityToConfidence,
  ruleScoreToProbability,
} from './confidenceBands.js';
import { looksLikeFaqQuestion, matchFaqEntry } from './glossary.js';
import {
  normalizeUtterance,
  stripOpenVerbPrefix,
  stripSurfaceNoise,
} from './normalizeConfig.js';
import { buildTypoLexicon, correctTypos } from './typoFix.js';
import type {
  IntentParsePack,
  ParseUtteranceResult,
  StepId,
} from './types.js';

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
    intent: 'help',
    patterns: [
      /\bwhat can you ?do\b/i,
      /\bwhat do you support\b/i,
      /\bwhat are you able to do\b/i,
      /\bshow me what you can do\b/i,
      /\bcapabilities\b/i,
      /^\s*help\s*[?.!]?\s*$/i,
      /\bhelp me (?:out|please)?\b/i,
    ],
  },
  {
    intent: 'cancel_all',
    patterns: [
      /\bcancel all\b/i,
      /\bclear (?:the )?(?:queue|plan)\b/i,
      /\breset (?:the )?(?:queue|plan)\b/i,
      /\bstart over\b/i,
    ],
  },
  {
    intent: 'do_it',
    patterns: [
      /^\s*do it\b/i,
      /^\s*go ahead\b/i,
      /^\s*click (?:it|that|the button)\b/i,
      /^\s*press (?:it|that|the button)\b/i,
      /^\s*submit\b/i,
    ],
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

function fuzzyIncludes(haystack: string, needle: string): boolean {
  if (!needle) return false;
  if (hasTokenBoundaryMatch(haystack, needle)) return true;
  // Mid-string includes only for multi-word phrases (avoid "late"→"lane"-style FPs).
  if (needle.includes(' ') && haystack.includes(needle)) return true;
  const words = haystack.split(' ');
  const needleWords = needle.split(' ');
  if (needleWords.length === 1) {
    const n = needleWords[0];
    // Short tokens: exact word only (late≠lane). Longer tokens allow edit distance 1.
    if (!n || n.length < 6) return false;
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
  // Prefer word-boundary hits over raw mid-string includes.
  if (hasTokenBoundaryMatch(haystack, p)) return 500 + p.length * 2 - singleWordPenalty;
  // Demoted: continuous substring without boundaries (multi-word only).
  if (wordCount > 1 && haystack.includes(p)) return 320 + p.length - singleWordPenalty;
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

/** Treat scores within this fraction of the best as a keyword collision. */
const COLLISION_SCORE_RATIO = 0.92;

function matchStepCandidates(
  text: string,
  pack: IntentParsePack
): Array<{ id: StepId; score: number }> {
  const n = text.includes(' ') || text === text.toLowerCase() ? text : normalizeUtterance(text, pack.normalize);
  const haystack = normalizeUtterance(n, pack.normalize);
  const haystackBare = stripOpenVerbPrefix(haystack, pack.normalize);
  const haystackNoSurface = stripSurfaceNoise(haystack, pack.normalize);
  const haystackBareNoSurface = stripSurfaceNoise(haystackBare, pack.normalize);
  const haystacks = [
    ...new Set(
      [haystack, haystackBare, haystackNoSurface, haystackBareNoSurface].filter(Boolean)
    ),
  ];
  const bestByStep = new Map<StepId, number>();

  for (const step of pack.steps) {
    const phrases = [step.title, ...step.keywords, ...(pack.aliases[step.id] || [])];
    for (const phrase of phrases) {
      let score = 0;
      for (const h of haystacks) {
        score = Math.max(score, phraseScore(h, phrase));
      }
      if (score <= 0) continue;
      const prev = bestByStep.get(step.id) ?? 0;
      if (score > prev) bestByStep.set(step.id, score);
    }
  }

  let top = 0;
  for (const score of bestByStep.values()) {
    if (score > top) top = score;
  }
  if (top <= 0) return [];

  const floor = top * COLLISION_SCORE_RATIO;
  return [...bestByStep.entries()]
    .filter(([, score]) => score >= floor)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export function parseUtterance(
  raw: string,
  pack: IntentParsePack,
  _opts?: import('./types.js').ParseUtteranceOpts
): ParseUtteranceResult {
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

  const normalized = correctTypos(
    normalizeUtterance(text, pack.normalize),
    buildTypoLexicon(pack)
  );

  // First-class FAQ: question-shaped asks that hit the catalog win at parse time.
  if (pack.faq?.length && looksLikeFaqQuestion(text)) {
    const faqHit = matchFaqEntry(pack.faq, text);
    if (faqHit) {
      return {
        stepId: null,
        slotPatches: {},
        isCorrection: false,
        goBack: false,
        rawIntent: 'faq',
        faqId: faqHit.id,
        confidence: 'high',
        probability: 1,
      };
    }
  }

  const meta = matchMetaIntent(normalized, pack.meta);
  const goBack = meta === 'go_back';
  const isCorrection = !goBack && CORRECTION_RE.test(normalized);
  const metaBlocksStep =
    goBack ||
    meta === 'whats_next' ||
    meta === 'explain_field' ||
    meta === 'help' ||
    meta === 'cancel_all' ||
    meta === 'do_it' ||
    meta === 'skip_side_actions' ||
    meta === 'lookup_participant';

  const stepHits = metaBlocksStep ? [] : matchStepCandidates(normalized, pack);
  let stepId: StepId | null = stepHits.length === 1 ? (stepHits[0]?.id ?? null) : null;
  const candidates =
    !metaBlocksStep && stepHits.length >= 2 ? stepHits.map((h) => h.id) : undefined;

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
  else if (meta === 'help') rawIntent = 'help';
  else if (meta === 'cancel_all') rawIntent = 'cancel_all';
  else if (meta === 'do_it') rawIntent = 'do_it';
  else if (meta === 'skip_side_actions') rawIntent = 'skip_side_actions';
  else if (meta === 'lookup_participant') rawIntent = 'lookup_participant';
  else if (candidates && candidates.length >= 2) rawIntent = 'ambiguous';
  else if (isCorrection) rawIntent = 'correction';
  else if (stepId) rawIntent = `goto:${stepId}`;
  else rawIntent = 'unknown';

  const topScore = stepHits[0]?.score ?? 0;
  let confidence: 'high' | 'mid' | 'low' | undefined;
  let probability: number | undefined;
  if (stepId || (candidates && candidates.length >= 2)) {
    probability = ruleScoreToProbability(topScore);
    confidence = probabilityToConfidence(probability);
  }

  return {
    stepId,
    candidates,
    slotPatches: {},
    isCorrection,
    goBack,
    rawIntent,
    confidence,
    probability,
  };
}
