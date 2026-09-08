import {
  normalizeUtterance,
  parseUtterance,
  type IntentParsePack,
  type ParseUtteranceResult,
  type SlotBag,
} from '@uipilot/core';
import { createRankerSession, type RankerSession } from './onnxLazy.js';
import type { RankerInferResult, RankerModelJson } from './types.js';

export type UtteranceParser = (
  raw: string,
  pack: IntentParsePack
) => ParseUtteranceResult | Promise<ParseUtteranceResult>;

const DEFAULT_MIN_PROB = 0.45;

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

function resultFromRanker(
  ranked: RankerInferResult,
  pack: IntentParsePack,
  raw: string
): ParseUtteranceResult {
  const label = ranked.intent.label;
  const slotPatches = extractHeuristicSlots(raw);

  if (label === 'go_back') {
    return {
      stepId: null,
      slotPatches,
      isCorrection: false,
      goBack: true,
      rawIntent: 'go_back',
    };
  }
  if (
    label === 'whats_next' ||
    label === 'explain_field' ||
    label === 'skip_side_actions' ||
    label === 'lookup_participant' ||
    label === 'ambiguous' ||
    label === 'correction' ||
    label === 'unknown' ||
    label === 'faq'
  ) {
    return {
      stepId: null,
      slotPatches,
      isCorrection: label === 'correction',
      goBack: false,
      rawIntent: label === 'unknown' ? 'unknown' : label,
    };
  }
  if (label.startsWith('goto:')) {
    const stepId = label.slice('goto:'.length);
    const known = pack.steps.some((s) => s.id === stepId);
    return {
      stepId: known ? stepId : null,
      slotPatches,
      isCorrection: false,
      goBack: false,
      rawIntent: known ? `goto:${stepId}` : 'unknown',
    };
  }
  return {
    stepId: null,
    slotPatches,
    isCorrection: false,
    goBack: false,
    rawIntent: 'unknown',
  };
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
  return async (raw, pack) => {
    if (!raw.trim()) return parseUtterance(raw, pack);
    const ranked = await session.infer(raw);
    if (ranked.intent.probability < minProb || ranked.intent.label === 'unknown') {
      const rules = parseUtterance(raw, pack);
      if (Object.keys(rules.slotPatches).length === 0) {
        return { ...rules, slotPatches: extractHeuristicSlots(raw) };
      }
      return rules;
    }
    const fromRanker = resultFromRanker(ranked, pack, raw);
    const rules = parseUtterance(raw, pack);
    if (
      rules.goBack ||
      rules.rawIntent === 'whats_next' ||
      rules.rawIntent === 'explain_field'
    ) {
      if (normalizeUtterance(raw).length < 40) {
        return {
          ...rules,
          slotPatches: { ...fromRanker.slotPatches, ...rules.slotPatches },
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
