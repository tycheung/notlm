import {
  CONFIDENCE_MID_MIN,
  normalizeUtterance,
  parseUtterance,
  probabilityToConfidence,
  type IntentParsePack,
  type ParseUtteranceOpts,
  type ParseUtteranceResult,
  type SlotBag,
  type StepId,
} from '@uipilot/core';
import { inferDecisionFromRanked } from './decision.js';
import { labelsForStepShortlist } from './infer.js';
import { createRankerSession, type RankerSession } from './onnxLazy.js';
import type { RankerInferResult, RankerModelJson } from './types.js';

export type UtteranceParser = (
  raw: string,
  pack: IntentParsePack,
  opts?: ParseUtteranceOpts
) => ParseUtteranceResult | Promise<ParseUtteranceResult>;

const DEFAULT_MIN_PROB = CONFIDENCE_MID_MIN;
const MID_MARGIN_MAX = 0.2;

/** Pull simple slot values: "quoted" phrases and key=value / key: value. */
export function extractHeuristicSlots(raw: string): SlotBag {
  const slots: SlotBag = {};
  const quoted = [...raw.matchAll(/["“]([^"”]+)["”]/g)];
  if (quoted[0]?.[1]) slots.value = quoted[0][1].trim();
  const kv = [
    ...raw.matchAll(/\b([a-zA-Z_][\w]*)\s*[:=]\s*["']?([^"'`,]+?)["']?(?=$|,|\s)/g),
  ];
  for (const m of kv) {
    const key = m[1]?.toLowerCase();
    const val = m[2]?.trim();
    if (key && val) slots[key] = val;
  }
  return slots;
}

function attachBands(
  result: ParseUtteranceResult,
  probability: number,
  decision: ReturnType<typeof inferDecisionFromRanked>
): ParseUtteranceResult {
  const confidence = probabilityToConfidence(probability);
  return {
    ...result,
    probability,
    confidence,
    decision: {
      stepDist: decision.stepDist,
      faqDist: decision.faqDist,
      isQuestion: decision.isQuestion,
      isOod: decision.isOod,
    },
  };
}

function resultFromRanker(
  ranked: RankerInferResult,
  pack: IntentParsePack,
  raw: string,
  decision: ReturnType<typeof inferDecisionFromRanked>
): ParseUtteranceResult {
  const label = ranked.intent.label;
  const slotPatches = extractHeuristicSlots(raw);
  const p = ranked.intent.probability;

  if (label === 'go_back') {
    return attachBands(
      {
        stepId: null,
        slotPatches,
        isCorrection: false,
        goBack: true,
        rawIntent: 'go_back',
      },
      p,
      decision
    );
  }
  if (
    label === 'whats_next' ||
    label === 'explain_field' ||
    label === 'help' ||
    label === 'skip_side_actions' ||
    label === 'lookup_participant' ||
    label === 'ambiguous' ||
    label === 'correction' ||
    label === 'unknown' ||
    label === 'faq'
  ) {
    const faqId =
      label === 'faq' ? decision.faqDist[0]?.faqId : undefined;
    return attachBands(
      {
        stepId: null,
        slotPatches,
        isCorrection: label === 'correction',
        goBack: false,
        rawIntent: label === 'unknown' ? 'unknown' : label,
        faqId,
      },
      p,
      decision
    );
  }
  if (label.startsWith('goto:')) {
    const stepId = label.slice('goto:'.length) as StepId;
    const known = pack.steps.some((s) => s.id === stepId);
    const topSteps = decision.stepDist.slice(0, 2).map((s) => s.stepId);
    const margin =
      (decision.stepDist[0]?.probability ?? 0) -
      (decision.stepDist[1]?.probability ?? 0);
    const candidates =
      known &&
      topSteps.length >= 2 &&
      probabilityToConfidence(p) === 'mid' &&
      margin < MID_MARGIN_MAX
        ? topSteps
        : undefined;
    return attachBands(
      {
        stepId: known ? stepId : null,
        candidates,
        slotPatches,
        isCorrection: false,
        goBack: false,
        rawIntent: known ? `goto:${stepId}` : 'unknown',
      },
      p,
      decision
    );
  }
  return attachBands(
    {
      stepId: null,
      slotPatches,
      isCorrection: false,
      goBack: false,
      rawIntent: 'unknown',
    },
    p,
    decision
  );
}

/**
 * Feature-flagged hybrid parser: ONNX/JSON ranker first; fall back to rules
 * when confidence is low or label is unknown.
 */
export function createHybridUtteranceParser(
  session: RankerSession,
  opts?: { minProbability?: number }
): UtteranceParser {
  const minProb = opts?.minProbability ?? DEFAULT_MIN_PROB;
  return async (raw, pack, parseOpts) => {
    if (!raw.trim()) return parseUtterance(raw, pack, parseOpts);
    const labels = labelsForStepShortlist(
      session.model.intentLabels,
      parseOpts?.shortlistStepIds
    );
    const ranked = await session.infer(raw, { labels });
    const decision = inferDecisionFromRanked(ranked, pack, raw);

    // Prefer FAQ when question-shaped and catalog hits.
    if (decision.isQuestion >= 0.55 && decision.faqDist[0]?.faqId) {
      const faqId = decision.faqDist[0].faqId;
      if (faqId !== 'faq' && pack.faq?.some((f) => f.id === faqId)) {
        return attachBands(
          {
            stepId: null,
            slotPatches: extractHeuristicSlots(raw),
            isCorrection: false,
            goBack: false,
            rawIntent: 'faq',
            faqId,
          },
          Math.max(decision.faqDist[0].probability, decision.topProbability),
          decision
        );
      }
    }

    if (
      ranked.intent.probability < minProb ||
      ranked.intent.label === 'unknown' ||
      decision.isOod >= 0.55
    ) {
      const rules = parseUtterance(raw, pack, parseOpts);
      if (Object.keys(rules.slotPatches).length === 0) {
        return { ...rules, slotPatches: extractHeuristicSlots(raw) };
      }
      return rules;
    }
    const fromRanker = resultFromRanker(ranked, pack, raw, decision);
    const rules = parseUtterance(raw, pack, parseOpts);
    if (
      rules.goBack ||
      rules.rawIntent === 'whats_next' ||
      rules.rawIntent === 'explain_field' ||
      rules.rawIntent === 'help'
    ) {
      if (normalizeUtterance(raw).length < 40) {
        return {
          ...rules,
          slotPatches: { ...fromRanker.slotPatches, ...rules.slotPatches },
          probability: rules.probability ?? fromRanker.probability,
          confidence: rules.confidence ?? fromRanker.confidence,
          decision: fromRanker.decision,
        };
      }
    }
    return fromRanker;
  };
}

/** JSON-backend hybrid (tests / environments without ORT). */
export function createJsonHybridParser(
  model: RankerModelJson,
  opts?: { minProbability?: number }
): UtteranceParser {
  return createHybridUtteranceParser(
    createRankerSession(model, { preferOnnx: false }),
    opts
  );
}
