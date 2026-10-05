/**
 * Compile pack `heuristics.json` (+ platform defaults) into RegExp once at load.
 * Engines stay in TS; words/phrases/regex source strings live in pack JSON.
 */
import type { HeuristicsConfig, NormalizeConfig, SlotExtractorDef } from './types.js';
import { escapeRegExp } from './fuzzyText.js';
import { PLATFORM_HEURISTICS } from './heuristicsDefaults.js';

export type CompiledSlotExtractor = {
  id: string;
  pattern: RegExp;
  slotKey: string;
  value?: string;
  altKeys?: string[];
  allowWithoutKeys: boolean;
};

export type CompiledDiscourseHeuristics = {
  lead: RegExp | null;
  trail: RegExp | null;
  other: RegExp[];
  meantOther: RegExp[];
  undo: RegExp[];
  again: RegExp[];
  thatStep: RegExp[];
  entity: RegExp[];
  choiceIndex: RegExp | null;
  indexWords: Record<string, number>;
  repairName: RegExp[];
  repairNameValue: RegExp | null;
  renameTo: RegExp | null;
  slotExtractors: CompiledSlotExtractor[];
};

export type CompiledHeuristics = {
  oodTopicRe: RegExp | null;
  oodPhraseRes: RegExp[];
  discourse: CompiledDiscourseHeuristics;
  contextAsk: RegExp[];
  explainLast: RegExp[];
  explainLastExact: Set<string>;
  deskHandoff: RegExp[];
  confirmYes: RegExp | null;
  confirmNo: RegExp | null;
  navCommand: RegExp | null;
  faqQuestion: RegExp[];
  compare: RegExp[];
  correction: RegExp | null;
  conceptual: RegExp[];
  askDisfluencyLead: RegExp | null;
  askPoliteTrail: RegExp | null;
  contentStopwords: Set<string>;
  oodQuestionFrames: RegExp[];
  oodStopwords: Set<string>;
  /** Merged config (strings) for empty-pack / inventory tests. */
  source: HeuristicsConfig;
};

function uniqStrings(lists: Array<readonly string[] | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    if (!list?.length) continue;
    for (const raw of list) {
      const s = String(raw ?? '').trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function compileOne(src: string | undefined | null, flags = 'i'): RegExp | null {
  const s = String(src ?? '').trim();
  if (!s) return null;
  try {
    return new RegExp(s, flags);
  } catch {
    return null;
  }
}

function compileMany(srcs: readonly string[] | undefined | null, flags = 'i'): RegExp[] {
  if (!srcs?.length) return [];
  const out: RegExp[] = [];
  for (const src of srcs) {
    const re = compileOne(src, flags);
    if (re) out.push(re);
  }
  return out;
}

function altJoin(words: readonly string[]): string {
  return words
    .map((w) => escapeRegExp(w.trim()))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .join('|');
}

function leadFromWords(words: readonly string[]): RegExp | null {
  if (!words.length) return null;
  return new RegExp(`^(${altJoin(words)})\\s+`, 'i');
}

function trailFromWords(words: readonly string[]): RegExp | null {
  if (!words.length) return null;
  return new RegExp(`\\s+(${altJoin(words)})\\s*$`, 'i');
}

function mergeIndexWords(
  base?: Record<string, number> | null,
  overlay?: Record<string, number> | null
): Record<string, number> {
  return { ...(base ?? {}), ...(overlay ?? {}) };
}

function mergeSlotExtractors(
  base?: SlotExtractorDef[] | null,
  overlay?: SlotExtractorDef[] | null
): SlotExtractorDef[] {
  const byId = new Map<string, SlotExtractorDef>();
  for (const list of [base, overlay]) {
    if (!list?.length) continue;
    for (const ex of list) {
      const id = String(ex.id ?? '').trim();
      if (!id || !ex.pattern || !ex.slotKey) continue;
      byId.set(id, ex);
    }
  }
  return [...byId.values()];
}

/** Deep-merge pack overlay onto platform defaults (arrays union; maps overlay). */
export function mergeHeuristicsConfig(
  overlay?: HeuristicsConfig | null,
  normalize?: NormalizeConfig | null
): HeuristicsConfig {
  const base = PLATFORM_HEURISTICS;
  const o = overlay ?? {};
  const dBase = base.discourse ?? {};
  const dOver = o.discourse ?? {};

  const leadFillers = uniqStrings([
    dBase.leadFillers,
    dOver.leadFillers,
    normalize?.leadingPoliteness,
  ]);
  const trailFillers = uniqStrings([
    dBase.trailFillers,
    dOver.trailFillers,
    normalize?.trailingFillers,
  ]);

  return {
    ood: {
      topicTokens: uniqStrings([base.ood?.topicTokens, o.ood?.topicTokens]),
      phrasePatterns: uniqStrings([base.ood?.phrasePatterns, o.ood?.phrasePatterns]),
    },
    discourse: {
      leadFillers,
      trailFillers,
      otherPatterns: uniqStrings([dBase.otherPatterns, dOver.otherPatterns]),
      meantOtherPatterns: uniqStrings([
        dBase.meantOtherPatterns,
        dOver.meantOtherPatterns,
      ]),
      undoPatterns: uniqStrings([dBase.undoPatterns, dOver.undoPatterns]),
      againPatterns: uniqStrings([dBase.againPatterns, dOver.againPatterns]),
      thatStepPatterns: uniqStrings([dBase.thatStepPatterns, dOver.thatStepPatterns]),
      entityPatterns: uniqStrings([dBase.entityPatterns, dOver.entityPatterns]),
      choiceIndexPattern: dOver.choiceIndexPattern ?? dBase.choiceIndexPattern,
      indexWords: mergeIndexWords(dBase.indexWords, dOver.indexWords),
      repairNamePatterns: uniqStrings([
        dBase.repairNamePatterns,
        dOver.repairNamePatterns,
      ]),
      repairNameValuePattern:
        dOver.repairNameValuePattern ?? dBase.repairNameValuePattern,
      renameToPattern: dOver.renameToPattern ?? dBase.renameToPattern,
      slotExtractors: mergeSlotExtractors(dBase.slotExtractors, dOver.slotExtractors),
    },
    contextAskPatterns: uniqStrings([base.contextAskPatterns, o.contextAskPatterns]),
    explainLastPatterns: uniqStrings([
      base.explainLastPatterns,
      o.explainLastPatterns,
    ]),
    explainLastExact: uniqStrings([base.explainLastExact, o.explainLastExact]),
    deskHandoffPatterns: uniqStrings([
      base.deskHandoffPatterns,
      o.deskHandoffPatterns,
    ]),
    confirmYes: uniqStrings([base.confirmYes, o.confirmYes]),
    confirmNo: uniqStrings([base.confirmNo, o.confirmNo]),
    navCommandVerbs: uniqStrings([base.navCommandVerbs, o.navCommandVerbs]),
    faqQuestionPatterns: uniqStrings([
      base.faqQuestionPatterns,
      o.faqQuestionPatterns,
    ]),
    comparePatterns: uniqStrings([base.comparePatterns, o.comparePatterns]),
    correctionPatterns: uniqStrings([
      base.correctionPatterns,
      o.correctionPatterns,
    ]),
    conceptualQuestionPatterns: uniqStrings([
      base.conceptualQuestionPatterns,
      o.conceptualQuestionPatterns,
    ]),
    askDisfluencyLead: uniqStrings([base.askDisfluencyLead, o.askDisfluencyLead]),
    askPoliteTrail: uniqStrings([base.askPoliteTrail, o.askPoliteTrail]),
    contentStopwords: uniqStrings([base.contentStopwords, o.contentStopwords]),
    oodQuestionFrames: uniqStrings([base.oodQuestionFrames, o.oodQuestionFrames]),
    oodStopwords: uniqStrings([base.oodStopwords, o.oodStopwords]),
  };
}

function compileSlotExtractors(
  defs: SlotExtractorDef[] | undefined
): CompiledSlotExtractor[] {
  if (!defs?.length) return [];
  const out: CompiledSlotExtractor[] = [];
  for (const def of defs) {
    const re = compileOne(def.pattern);
    if (!re) continue;
    out.push({
      id: def.id,
      pattern: re,
      slotKey: def.slotKey,
      value: def.value,
      altKeys: def.altKeys?.length ? [...def.altKeys] : undefined,
      allowWithoutKeys: def.allowWithoutKeys !== false,
    });
  }
  return out;
}

export function compileHeuristics(
  overlay?: HeuristicsConfig | null,
  normalize?: NormalizeConfig | null
): CompiledHeuristics {
  const cfg = mergeHeuristicsConfig(overlay, normalize);
  const d = cfg.discourse ?? {};
  const topics = cfg.ood?.topicTokens ?? [];
  const oodTopicRe =
    topics.length > 0
      ? new RegExp(
          `\\b(${topics
            .map((t) =>
              t
                .trim()
                .split(/\s+/)
                .map(escapeRegExp)
                .join('\\s+')
            )
            .filter(Boolean)
            .sort((a, b) => b.length - a.length)
            .join('|')})\\b`,
          'i'
        )
      : null;

  const yes = (cfg.confirmYes ?? []).map(escapeRegExp).filter(Boolean);
  const no = (cfg.confirmNo ?? []).map(escapeRegExp).filter(Boolean);
  const nav = cfg.navCommandVerbs ?? [];

  return {
    oodTopicRe,
    oodPhraseRes: compileMany(cfg.ood?.phrasePatterns),
    discourse: {
      lead: leadFromWords(d.leadFillers ?? []),
      trail: trailFromWords(d.trailFillers ?? []),
      other: compileMany(d.otherPatterns),
      meantOther: compileMany(d.meantOtherPatterns),
      undo: compileMany(d.undoPatterns),
      again: compileMany(d.againPatterns),
      thatStep: compileMany(d.thatStepPatterns),
      entity: compileMany(d.entityPatterns),
      choiceIndex: compileOne(d.choiceIndexPattern),
      indexWords: { ...(d.indexWords ?? {}) },
      repairName: compileMany(d.repairNamePatterns),
      repairNameValue: compileOne(d.repairNameValuePattern),
      renameTo: compileOne(d.renameToPattern),
      slotExtractors: compileSlotExtractors(d.slotExtractors),
    },
    contextAsk: compileMany(cfg.contextAskPatterns),
    explainLast: compileMany(cfg.explainLastPatterns),
    explainLastExact: new Set(
      (cfg.explainLastExact ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean)
    ),
    deskHandoff: compileMany(cfg.deskHandoffPatterns),
    confirmYes: yes.length
      ? new RegExp(`^(${yes.join('|')})\\b`, 'i')
      : null,
    confirmNo: no.length
      ? new RegExp(`^(${no.join('|')})\\b`, 'i')
      : null,
    navCommand: nav.length
      ? new RegExp(`^(please\\s+)?(${altJoin(nav)})\\b`, 'i')
      : null,
    faqQuestion: compileMany(cfg.faqQuestionPatterns),
    compare: compileMany(cfg.comparePatterns),
    correction: (() => {
      const parts = cfg.correctionPatterns ?? [];
      if (!parts.length) return null;
      // Single correction source is already a full alternation; use first if one,
      // else join as alternation of sources.
      if (parts.length === 1) return compileOne(parts[0]!);
      return compileOne(`(?:${parts.join(')|(?:')})`);
    })(),
    conceptual: compileMany(cfg.conceptualQuestionPatterns),
    askDisfluencyLead: leadFromWords(cfg.askDisfluencyLead ?? []),
    askPoliteTrail: trailFromWords(cfg.askPoliteTrail ?? []),
    contentStopwords: new Set(
      (cfg.contentStopwords ?? []).map((s) => s.toLowerCase())
    ),
    oodQuestionFrames: compileMany(cfg.oodQuestionFrames),
    oodStopwords: new Set((cfg.oodStopwords ?? []).map((s) => s.toLowerCase())),
    source: cfg,
  };
}

/** Platform defaults compiled once (no pack overlay). */
export const DEFAULT_HEURISTICS: CompiledHeuristics = compileHeuristics();

/** True when compiled source contains any of the given host-brand tokens. */
export function heuristicsContainHostBleed(
  h: CompiledHeuristics,
  forbidden: readonly string[] = []
): boolean {
  if (!forbidden.length) return false;
  const blob = JSON.stringify(h.source).toLowerCase();
  return forbidden.some((f) => blob.includes(f.toLowerCase()));
}

export function anyReTest(res: RegExp[], text: string): boolean {
  return res.some((re) => re.test(text));
}
