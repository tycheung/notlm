/**
 * ADR-011 tree parser: Stage0 plane → Stage1 lane → Stage2 leaf specialists.
 * Optional planeModel / laneModel / leafModels; inner parser is flat fallback.
 */

import {
  CAPABILITY_LANES,
  inferPlaneHeuristic,
  isCapabilityLane,
  laneAllowed,
  laneFromRawIntent,
  type CapabilityLane,
  type IntentParsePack,
  type InteractionPlane,
  type ParseUtteranceOpts,
  type ParseUtteranceResult,
} from '@notlm/core';
import type { UtteranceParser } from './hybrid.js';
import type { RankerModelJson } from './types.js';
import { createJsonHybridParser } from './hybrid.js';
import { createRankerSession, type RankerSession } from './onnxLazy.js';
import { inferRankerJson } from './infer.js';

export type TreeParserOptions = {
  /** Stage0 ask|guide|do model (intentLabels must be plane names). */
  planeModel?: RankerModelJson | null;
  /** Stage1 capability-lane model (intentLabels = CAPABILITY_LANES). */
  laneModel?: RankerModelJson | null;
  /** Stage2 leaf models keyed by lane or autosplit child id (`goto__a`). */
  leafModels?: Record<string, RankerModelJson> | null;
  minPlaneProbability?: number;
  minLaneProbability?: number;
};

function planeFromModel(
  raw: string,
  model: RankerModelJson,
  minProb: number
): { plane: InteractionPlane; probability: number } | null {
  try {
    const ranked = inferRankerJson(model, raw);
    const label = String(ranked.intent.label || '').toLowerCase();
    const p = ranked.intent.probability;
    if (p < minProb) return null;
    if (label === 'ask' || label === 'guide' || label === 'do') {
      return { plane: label, probability: p };
    }
  } catch {
    /* fall through to heuristic */
  }
  return null;
}

function laneFromModel(
  raw: string,
  model: RankerModelJson,
  minProb: number
): { lane: CapabilityLane; probability: number } | null {
  try {
    const ranked = inferRankerJson(model, raw);
    const label = String(ranked.intent.label || '').toLowerCase();
    const p = ranked.intent.probability;
    if (p < minProb) return null;
    if (isCapabilityLane(label)) return { lane: label, probability: p };
    // Autosplit children map back to parent lane for mask checks.
    const parent = label.replace(/__[ab]$/i, '');
    if (isCapabilityLane(parent)) return { lane: parent, probability: p };
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Prefer autosplit children (`lane__a` / `lane__b`) by top intent probability;
 * else the parent leaf id.
 */
export function pickLeafModelId(
  lane: string,
  models: Record<string, RankerModelJson>,
  raw: string
): string | null {
  const childAKey = `${lane}__a`;
  const childBKey = `${lane}__b`;
  const childA = models[childAKey];
  const childB = models[childBKey];
  if (childA && childB) {
    try {
      const ra = inferRankerJson(childA, raw);
      const rb = inferRankerJson(childB, raw);
      return ra.intent.probability >= rb.intent.probability ? childAKey : childBKey;
    } catch {
      return childAKey;
    }
  }
  return models[lane] ? lane : null;
}

/** Prefer autosplit children by top intent probability; else the parent leaf model. */
export function pickLeafModel(
  lane: string,
  models: Record<string, RankerModelJson>,
  raw: string
): RankerModelJson | null {
  const id = pickLeafModelId(lane, models, raw);
  return id ? (models[id] ?? null) : null;
}

function annotateTree(
  raw: string,
  pack: IntentParsePack,
  parsed: ParseUtteranceResult,
  opts?: TreeParserOptions
): ParseUtteranceResult {
  const minPlane = opts?.minPlaneProbability ?? 0.4;
  const minLane = opts?.minLaneProbability ?? 0.35;
  const fromModel =
    opts?.planeModel != null
      ? planeFromModel(raw, opts.planeModel, minPlane)
      : null;
  const inferred = fromModel
    ? {
        plane: fromModel.plane,
        probability: fromModel.probability,
        source: 'ranker' as const,
      }
    : inferPlaneHeuristic(raw, {
        faqDomainTokens: pack.faqDomainTokens,
        heuristics: pack.compiledHeuristics,
      });
  const plane = inferred.plane;

  const fromLaneModel =
    opts?.laneModel != null
      ? laneFromModel(raw, opts.laneModel, minLane)
      : null;
  // Stage1 must respect Stage0 plane mask when pack ships routingTree.
  const maskedLaneModel =
    fromLaneModel &&
    (!pack.routingTree?.enabled ||
      laneAllowed(plane, fromLaneModel.lane, pack.routingTree))
      ? fromLaneModel
      : null;
  const mutationRisk =
    parsed.mutationId && Array.isArray(pack.mutations)
      ? pack.mutations.find((m) => m.id === parsed.mutationId)?.risk
      : undefined;
  const lane =
    maskedLaneModel?.lane ??
    laneFromRawIntent(parsed.rawIntent, {
      faqId: parsed.faqId,
      queryId: parsed.queryId,
      mutationId: parsed.mutationId,
      mutationRisk,
    }) ??
    (parsed.tourId
      ? 'tour'
      : parsed.searchId
        ? 'search'
        : undefined);

  return {
    ...parsed,
    plane,
    planeProbability: inferred.probability,
    ...(lane ? { lane, leaf: parsed.leaf ?? lane } : {}),
  };
}

/**
 * Wrap any utterance parser with plane/lane annotation (Stage0/1).
 * When a leaf specialist exists for the lane (incl. `__a`/`__b`), re-run it
 * to refine the leaf label (Stage2).
 */
export function createTreeUtteranceParser(
  inner: UtteranceParser,
  treeOpts?: TreeParserOptions
): UtteranceParser {
  return async (raw, pack, opts?: ParseUtteranceOpts) => {
    let parsed = await Promise.resolve(inner(raw, pack, opts));
    parsed = annotateTree(raw, pack, parsed, treeOpts);
    const lane = parsed.lane;
    const leafId =
      lane && treeOpts?.leafModels
        ? pickLeafModelId(lane, treeOpts.leafModels, raw)
        : null;
    const leafModel = leafId && treeOpts?.leafModels ? treeOpts.leafModels[leafId] : null;
    if (leafId && leafModel) {
      try {
        const leafParser = createJsonHybridParser(leafModel);
        const leafParsed = await Promise.resolve(leafParser(raw, pack, opts));
        parsed = annotateTree(
          raw,
          pack,
          {
            ...leafParsed,
            faqId: leafParsed.faqId ?? parsed.faqId,
            queryId: leafParsed.queryId ?? parsed.queryId,
            mutationId: leafParsed.mutationId ?? parsed.mutationId,
          },
          treeOpts
        );
        parsed = { ...parsed, leaf: leafId };
      } catch {
        parsed = { ...parsed, leaf: leafId };
      }
    }
    return parsed;
  };
}

/** Host helper: build leafModels map from pack `routingTree.leaves` stems + JSON blobs. */
export function leafModelsFromPackLeaves(
  leaves: Partial<Record<string, string>> | null | undefined,
  modelsByStem: Record<string, RankerModelJson>
): Record<string, RankerModelJson> {
  const out: Record<string, RankerModelJson> = {};
  if (!leaves) return out;
  for (const [lane, stem] of Object.entries(leaves)) {
    if (!stem) continue;
    const model = modelsByStem[stem] ?? modelsByStem[lane];
    if (model) out[lane] = model;
  }
  // Always expose CAPABILITY_LANES keys that have a model even if tree omits them.
  for (const lane of CAPABILITY_LANES) {
    const stem = `ranker.leaves.${lane}`;
    if (!out[lane] && modelsByStem[stem]) out[lane] = modelsByStem[stem];
  }
  return out;
}

export type { RankerSession };
export { createRankerSession };
