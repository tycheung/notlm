import {
  loadPackFromJson,
  parseUtterance,
  type BinderPredicate,
  type PackJsonInput,
  type ParseUtteranceResult,
  type ScenarioCase,
} from '@uipilot/core';

export type IntentCheckCase = ScenarioCase & { id?: string };

export type IntentCheckResult = {
  id?: string;
  utterance: string;
  ok: boolean;
  expected: IntentCheckCase['expect'];
  actual: Pick<
    ParseUtteranceResult,
    'stepId' | 'rawIntent' | 'goBack' | 'isCorrection'
  >;
  errors: string[];
};

export type CheckIntentsInput = {
  /** Pack JSON pieces (manifest/flow/controls/intents + binders). */
  pack: {
    manifest: PackJsonInput['manifest'];
    flow: PackJsonInput['flow'];
    controls?: PackJsonInput['controls'];
    intents: PackJsonInput['intents'];
    /** Object map or schema array of { stepId, …predicate }. */
    binders?: PackJsonInput['binders'] | Array<Record<string, unknown>>;
  };
  scenarios: IntentCheckCase[];
};

function normalizeBinders(
  binders: CheckIntentsInput['pack']['binders']
): PackJsonInput['binders'] {
  if (!binders) return {};
  if (!Array.isArray(binders)) return binders;

  const out: PackJsonInput['binders'] = {};
  for (const entry of binders) {
    if (entry == null || typeof entry !== 'object') continue;
    const { stepId, ...rest } = entry as { stepId?: unknown } & Record<string, unknown>;
    if (typeof stepId !== 'string' || !stepId) continue;
    out[stepId] = rest as BinderPredicate;
  }
  return out;
}

function compareExpect(
  expected: IntentCheckCase['expect'],
  actual: ParseUtteranceResult
): string[] {
  const errors: string[] = [];

  if ('stepId' in expected) {
    const want = expected.stepId ?? null;
    if (actual.stepId !== want) {
      errors.push(`stepId: expected ${JSON.stringify(want)}, got ${JSON.stringify(actual.stepId)}`);
    }
  }

  if ('rawIntent' in expected) {
    const want = expected.rawIntent ?? null;
    if (actual.rawIntent !== want) {
      errors.push(
        `rawIntent: expected ${JSON.stringify(want)}, got ${JSON.stringify(actual.rawIntent)}`
      );
    }
  }

  if ('goBack' in expected && expected.goBack !== undefined) {
    if (actual.goBack !== expected.goBack) {
      errors.push(`goBack: expected ${expected.goBack}, got ${actual.goBack}`);
    }
  }

  if ('isCorrection' in expected && expected.isCorrection !== undefined) {
    if (actual.isCorrection !== expected.isCorrection) {
      errors.push(`isCorrection: expected ${expected.isCorrection}, got ${actual.isCorrection}`);
    }
  }

  return errors;
}

/** Run scenarios against pack intents (deterministic; no LLM). */
export function checkIntents(input: CheckIntentsInput): {
  ok: boolean;
  results: IntentCheckResult[];
} {
  const loaded = loadPackFromJson({
    manifest: input.pack.manifest,
    flow: input.pack.flow,
    controls: input.pack.controls ?? [],
    intents: input.pack.intents,
    binders: normalizeBinders(input.pack.binders),
  });

  const results: IntentCheckResult[] = input.scenarios.map((scenario) => {
    const actual = parseUtterance(scenario.utterance, loaded);
    const errors = compareExpect(scenario.expect, actual);
    return {
      id: scenario.id,
      utterance: scenario.utterance,
      ok: errors.length === 0,
      expected: scenario.expect,
      actual: {
        stepId: actual.stepId,
        rawIntent: actual.rawIntent,
        goBack: actual.goBack,
        isCorrection: actual.isCorrection,
      },
      errors,
    };
  });

  return { ok: results.every((r) => r.ok), results };
}
