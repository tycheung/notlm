import {
  looksLikeFaqQuestion,
  matchFaqEntry,
  type IntentParsePack,
  type ParseDecisionHeads,
  type StepId,
} from '@uipilot/core';
import type { RankerInferResult, RankerIntentScore, RankerModelJson } from './types.js';
import { inferRankerJson, labelsForStepShortlist } from './infer.js';

export type RankerDecision = ParseDecisionHeads & {
  /** Top decision probability after shortlist renorm. */
  topProbability: number;
  /** Underlying intent distribution used for heads. */
  ranked: RankerInferResult;
};

function renormPairs(
  pairs: Array<{ id: string; probability: number }>
): Array<{ id: string; probability: number }> {
  const sum = pairs.reduce((a, b) => a + b.probability, 0) || 1;
  return pairs
    .map((p) => ({ ...p, probability: p.probability / sum }))
    .sort((a, b) => b.probability - a.probability);
}

function stepDistFromIntents(
  intents: RankerIntentScore[]
): Array<{ stepId: StepId; probability: number }> {
  const steps = intents
    .filter((i) => i.label.startsWith('goto:'))
    .map((i) => ({
      stepId: i.label.slice('goto:'.length) as StepId,
      probability: i.probability,
    }));
  const sum = steps.reduce((a, b) => a + b.probability, 0) || 1;
  return steps
    .map((s) => ({ ...s, probability: s.probability / sum }))
    .sort((a, b) => b.probability - a.probability);
}

/**
 * Derive System One decision heads from a flat ranker distribution + pack FAQ.
 * No new model weights — buckets existing softmax mass.
 */
export function inferDecisionFromRanked(
  ranked: RankerInferResult,
  pack: IntentParsePack,
  utterance: string
): RankerDecision {
  const intents = ranked.intents;
  const unknownMass =
    intents.find((i) => i.label === 'unknown')?.probability ?? 0;
  const faqLabelMass = intents.find((i) => i.label === 'faq')?.probability ?? 0;
  const questionHeuristic = looksLikeFaqQuestion(utterance) ? 1 : 0;
  const isQuestion = Math.max(faqLabelMass, questionHeuristic * Math.max(faqLabelMass, 0.55));

  const faqDist: Array<{ faqId: string; probability: number }> = [];
  if (pack.faq?.length) {
    const hit = matchFaqEntry(pack.faq, utterance);
    if (hit) {
      faqDist.push({
        faqId: hit.id,
        probability: Math.max(faqLabelMass, questionHeuristic ? 0.7 : 0.4),
      });
    } else if (faqLabelMass > 0.05) {
      faqDist.push({ faqId: 'faq', probability: faqLabelMass });
    }
  }

  const stepDist = stepDistFromIntents(intents);
  const topProbability = ranked.intent.probability;

  return {
    stepDist,
    faqDist: renormPairs(faqDist.map((f) => ({ id: f.faqId, probability: f.probability }))).map(
      (p) => ({ faqId: p.id, probability: p.probability })
    ),
    isQuestion,
    isOod: unknownMass,
    topProbability,
    ranked,
  };
}

/** Infer + bucket heads (JSON path). */
export function inferDecision(
  model: RankerModelJson,
  utterance: string,
  pack: IntentParsePack,
  opts?: { shortlistStepIds?: string[] }
): RankerDecision {
  const labels = labelsForStepShortlist(model.intentLabels, opts?.shortlistStepIds);
  const ranked = inferRankerJson(model, utterance, { labels });
  return inferDecisionFromRanked(ranked, pack, utterance);
}
