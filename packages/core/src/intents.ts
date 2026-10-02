import { looksLikeClearOod } from './askNormalize.js';
import { editDistance, hasTokenBoundaryMatch } from './fuzzyText.js';
import {
  probabilityToConfidence,
  ruleScoreToProbability,
} from './confidenceBands.js';
import {
  isStrongFaqAliasMatch,
  looksLikeNavCommand,
  matchFaqEntry,
} from './glossary.js';
import {
  DEFAULT_HEURISTICS,
  type CompiledHeuristics,
} from './heuristics.js';
import { PLATFORM_META_PATTERNS } from './heuristicsDefaults.js';
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

function resolveHeuristics(pack: IntentParsePack): CompiledHeuristics {
  return pack.compiledHeuristics ?? DEFAULT_HEURISTICS;
}

function compilePackMetaPatterns(
  defs?: Array<{ intent: string; patterns: string[] }> | null
): Array<{ intent: string; patterns: RegExp[] }> {
  if (!defs?.length) return [];
  const out: Array<{ intent: string; patterns: RegExp[] }> = [];
  for (const def of defs) {
    const intent = def.intent?.trim();
    if (!intent || !def.patterns?.length) continue;
    const patterns: RegExp[] = [];
    for (const src of def.patterns) {
      const s = String(src ?? '').trim();
      if (!s) continue;
      try {
        patterns.push(new RegExp(s, 'i'));
      } catch {
        // Ignore invalid host regex rather than crashing parse.
      }
    }
    if (patterns.length) out.push({ intent, patterns });
  }
  return out;
}

export function matchMetaIntent(
  text: string,
  enabledMeta?: string[],
  packPatterns?: Array<{ intent: string; patterns: string[] }> | null
): string | null {
  const all = [
    ...compilePackMetaPatterns(PLATFORM_META_PATTERNS),
    ...compilePackMetaPatterns(packPatterns),
  ];
  for (const meta of all) {
    if (enabledMeta && !enabledMeta.includes(meta.intent)) continue;
    if (meta.patterns.some((re) => re.test(text))) return meta.intent;
  }
  return null;
}

function stripLeadingArticles(text: string): string {
  return text.replace(/^(?:a|an|the)\s+/i, '').trim();
}

function stripInlineArticles(text: string): string {
  return text
    .replace(/\s+(?:a|an|the)\s+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

/** Treat scores within this fraction of the best as a keyword collision. */
const COLLISION_SCORE_RATIO = 0.92;

/** Pack-scoped exact index of normalized aliases → stepId. */
const exactAliasCache = new WeakMap<object, Map<string, StepId>>();

function exactAliasIndex(pack: IntentParsePack): Map<string, StepId> {
  const key = pack.aliases ?? pack.steps;
  let exact = exactAliasCache.get(key as object);
  if (exact) return exact;
  exact = new Map();
  for (const step of pack.steps) {
    const phrases = [step.title, ...step.keywords, ...(pack.aliases[step.id] || [])];
    for (const phrase of phrases) {
      const phraseNorm = normalizeUtterance(phrase, pack.normalize);
      const phraseBare = stripOpenVerbPrefix(phraseNorm, pack.normalize);
      // Multi-word only — short tokens stay in fuzzy scoring for collision detection.
      if (phraseNorm.includes(' ') && !exact.has(phraseNorm)) exact.set(phraseNorm, step.id);
      if (phraseBare.includes(' ') && !exact.has(phraseBare)) exact.set(phraseBare, step.id);
    }
  }
  exactAliasCache.set(key as object, exact);
  return exact;
}

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
      [haystack, haystackBare, haystackNoSurface, haystackBareNoSurface]
        .filter(Boolean)
        .flatMap((h) => {
          const variants = [h];
          const lead = stripLeadingArticles(h);
          if (lead && lead !== h) variants.push(lead);
          const inline = stripInlineArticles(h);
          if (inline && inline !== h && !variants.includes(inline)) variants.push(inline);
          return variants;
        })
    ),
  ];

  const exact = exactAliasIndex(pack);
  for (const h of haystacks) {
    const hit = exact.get(h);
    if (hit) return [{ id: hit, score: 1000 + h.length }];
  }

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

  const heuristics = resolveHeuristics(pack);
  const meta = matchMetaIntent(normalized, pack.meta, pack.metaPatterns);

  // First-class FAQ: catalog hits win at parse time (including compare asks),
  // unless the utterance is an explicit nav/create command or clear OOD.
  if (
    pack.faq?.length &&
    !looksLikeNavCommand(text, heuristics) &&
    !looksLikeClearOod(text, heuristics)
  ) {
    const faqHit = matchFaqEntry(pack.faq, text);
    const helpOverridesWeakFaq =
      meta === 'help' && faqHit && !isStrongFaqAliasMatch(text, faqHit);
    if (faqHit && !helpOverridesWeakFaq) {
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
  const goBack = meta === 'go_back';
  const isCorrection = !goBack && Boolean(heuristics.correction?.test(normalized));
  const metaBlocksStep =
    goBack ||
    meta === 'whats_next' ||
    meta === 'explain_field' ||
    meta === 'help' ||
    meta === 'cancel_all' ||
    meta === 'do_it' ||
    // Pack-supplied metas also block step scoring when they match.
    Boolean(meta && pack.metaPatterns?.some((p) => p.intent === meta));

  const stepHits = metaBlocksStep ? [] : matchStepCandidates(normalized, pack);
  let stepId: StepId | null = stepHits.length === 1 ? (stepHits[0]?.id ?? null) : null;
  const candidates =
    !metaBlocksStep && stepHits.length >= 2 ? stepHits.map((h) => h.id) : undefined;

  if (isCorrection && stepId) {
    const phrases = [
      ...(pack.steps.find((s) => s.id === stepId)?.keywords ?? []),
      ...(pack.aliases[stepId] || []),
    ];
    const strong = phrases.some((phrase) => {
      if (!phrase.includes(' ')) return false;
      const p = phrase.toLowerCase();
      if (normalized.includes(p)) return true;
      const pNorm = normalizeUtterance(phrase, pack.normalize);
      return Boolean(pNorm && pNorm.includes(' ') && normalized.includes(pNorm));
    });
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
  else if (meta) rawIntent = meta;
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
