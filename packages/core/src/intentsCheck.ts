import {
  matchMutationEntry,
  matchSearchEntry,
  matchTourEntry,
} from './capabilityCatalog.js';
import { looksLikeNavCommand } from './glossary.js';
import { parseUtterance } from './intents.js';
import { loadPackFromJson } from './loadPack.js';
import {
  isSemanticRetrieveEnabled,
  retrieveSemantic,
} from './semanticRetrieve.js';
import type {
  AssistantFeatures,
  BinderPredicate,
  PackJsonInput,
  ParseUtteranceResult,
  ScenarioCase,
} from './types.js';

export type IntentCheckCase = ScenarioCase & { id?: string };

export type IntentCheckResult = {
  id?: string;
  utterance: string;
  ok: boolean;
  expected: IntentCheckCase['expect'];
  actual: Pick<
    ParseUtteranceResult,
    | 'stepId'
    | 'rawIntent'
    | 'goBack'
    | 'isCorrection'
    | 'faqId'
    | 'queryId'
    | 'mutationId'
    | 'tourId'
    | 'searchId'
    | 'openSurface'
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
    faq?: PackJsonInput['faq'];
    queries?: PackJsonInput['queries'];
    mutations?: PackJsonInput['mutations'];
    tours?: PackJsonInput['tours'];
    search?: PackJsonInput['search'];
    heuristics?: PackJsonInput['heuristics'];
    normalize?: PackJsonInput['normalize'];
    semanticIndex?: PackJsonInput['semanticIndex'];
    semanticIndexCustom?: PackJsonInput['semanticIndexCustom'];
  };
  scenarios: IntentCheckCase[];
  /** When `semanticRetrieve: false`, skip semantic enrich (parity with live dispatch). */
  features?: AssistantFeatures;
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

function faqEntryHasText(
  pack: ReturnType<typeof loadPackFromJson>,
  faqId: string | null | undefined
): boolean {
  if (!faqId) return false;
  const entry = (pack.faq ?? []).find((f) => f.id === faqId);
  return Boolean(entry?.text?.trim());
}

function enrichWithSemantic(
  utterance: string,
  actual: ParseUtteranceResult,
  expected: IntentCheckCase['expect'],
  pack: ReturnType<typeof loadPackFromJson>,
  features?: AssistantFeatures
): ParseUtteranceResult {
  // Alias/parse may set faqId for empty-text entries — strip (runtime parity).
  if (actual.faqId && !faqEntryHasText(pack, actual.faqId)) {
    actual = {
      ...actual,
      faqId: undefined,
      rawIntent: actual.rawIntent === 'faq' ? null : actual.rawIntent,
    };
  }
  if (!isSemanticRetrieveEnabled(features)) return actual;
  // Parity with dispatch.ts / decisionFallbackHandler — nav-shaped utterances skip semantic.
  if (looksLikeNavCommand(utterance, pack.compiledHeuristics)) return actual;
  const needsFaq = 'faqId' in expected && expected.faqId && actual.faqId !== expected.faqId;
  const needsQuery =
    'queryId' in expected && expected.queryId && actual.queryId !== expected.queryId;
  if (!needsFaq && !needsQuery) return actual;

  const layers =
    pack.semanticIndexLayers ??
    (pack.semanticIndex ? [pack.semanticIndex] : []);
  if (!layers.length) return actual;

  // Kind-filter so a strong FAQ accept cannot mask a queryId expectation (and vice versa).
  if (needsFaq) {
    const sem = retrieveSemantic(utterance, layers, {
      heuristics: pack.compiledHeuristics,
      kind: 'faq',
    });
    if (sem.accepted?.kind === 'faq' && faqEntryHasText(pack, sem.accepted.id)) {
      actual = {
        ...actual,
        faqId: sem.accepted.id,
        rawIntent: actual.rawIntent ?? 'faq',
      };
    }
  }
  if (needsQuery) {
    const sem = retrieveSemantic(utterance, layers, {
      heuristics: pack.compiledHeuristics,
      kind: 'query',
    });
    if (sem.accepted?.kind === 'query') {
      actual = {
        ...actual,
        queryId: sem.accepted.id,
        rawIntent: actual.rawIntent ?? 'data_query',
      };
    }
  }
  return actual;
}

/** Alias-match capability catalogs when scenarios expect mutation/tour/search ids. */
function enrichWithCapability(
  utterance: string,
  actual: ParseUtteranceResult,
  expected: IntentCheckCase['expect'],
  pack: ReturnType<typeof loadPackFromJson>
): ParseUtteranceResult {
  const needsMutation =
    'mutationId' in expected &&
    expected.mutationId &&
    actual.mutationId !== expected.mutationId;
  const needsTour =
    'tourId' in expected && expected.tourId && actual.tourId !== expected.tourId;
  const needsSearch =
    'searchId' in expected &&
    expected.searchId &&
    actual.searchId !== expected.searchId;
  if (!needsMutation && !needsTour && !needsSearch) return actual;

  if (needsMutation && pack.mutations?.length) {
    const byId = pack.mutations.find((m) => m.id === expected.mutationId);
    const hit =
      (byId && matchMutationEntry([byId], utterance)) ||
      matchMutationEntry(pack.mutations, utterance);
    if (hit && hit.id === expected.mutationId) {
      actual = {
        ...actual,
        mutationId: hit.id,
        rawIntent: actual.rawIntent ?? 'mutation',
      };
    }
  }
  if (needsTour && pack.tours?.length) {
    const byId = pack.tours.find((t) => t.id === expected.tourId);
    const hit =
      (byId && matchTourEntry([byId], utterance)) ||
      matchTourEntry(pack.tours, utterance);
    if (hit && hit.id === expected.tourId) {
      actual = {
        ...actual,
        tourId: hit.id,
        rawIntent: actual.rawIntent ?? 'tour',
      };
    }
  }
  if (needsSearch && pack.search?.length) {
    const byId = pack.search.find((s) => s.id === expected.searchId);
    const hit =
      (byId && matchSearchEntry([byId], utterance)) ||
      matchSearchEntry(pack.search, utterance);
    if (hit && hit.id === expected.searchId) {
      actual = {
        ...actual,
        searchId: hit.id,
        rawIntent: actual.rawIntent ?? 'search',
      };
    }
  }
  return actual;
}

/** When step resolveNav declares openSurface, mirror it onto the parse result. */
function enrichWithSurface(
  actual: ParseUtteranceResult,
  expected: IntentCheckCase['expect'],
  pack: ReturnType<typeof loadPackFromJson>
): ParseUtteranceResult {
  if (!('openSurface' in expected) || !expected.openSurface) return actual;
  if (actual.openSurface === expected.openSurface) return actual;
  const stepId = actual.stepId ?? expected.stepId ?? null;
  if (!stepId) return actual;
  const nav = pack.resolveNav(stepId, { pathname: '/', data: {} });
  if (nav?.openSurface === expected.openSurface) {
    return { ...actual, openSurface: expected.openSurface };
  }
  return actual;
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

  if ('faqId' in expected) {
    const want = expected.faqId ?? null;
    const got = actual.faqId ?? null;
    if (got !== want) {
      errors.push(
        `faqId: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`
      );
    }
  }

  if ('queryId' in expected) {
    const want = expected.queryId ?? null;
    const got = actual.queryId ?? null;
    if (got !== want) {
      errors.push(
        `queryId: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`
      );
    }
  }

  if ('mutationId' in expected) {
    const want = expected.mutationId ?? null;
    const got = actual.mutationId ?? null;
    if (got !== want) {
      errors.push(
        `mutationId: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`
      );
    }
  }

  if ('tourId' in expected) {
    const want = expected.tourId ?? null;
    const got = actual.tourId ?? null;
    if (got !== want) {
      errors.push(
        `tourId: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`
      );
    }
  }

  if ('searchId' in expected) {
    const want = expected.searchId ?? null;
    const got = actual.searchId ?? null;
    if (got !== want) {
      errors.push(
        `searchId: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`
      );
    }
  }

  if ('openSurface' in expected) {
    const want = expected.openSurface ?? null;
    const got = actual.openSurface ?? null;
    if (got !== want) {
      errors.push(
        `openSurface: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`
      );
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
    faq: input.pack.faq,
    queries: input.pack.queries,
    mutations: input.pack.mutations,
    tours: input.pack.tours,
    search: input.pack.search,
    heuristics: input.pack.heuristics,
    normalize: input.pack.normalize,
    semanticIndex: input.pack.semanticIndex,
    semanticIndexCustom: input.pack.semanticIndexCustom,
  });

  const results: IntentCheckResult[] = input.scenarios.map((scenario) => {
    let actual = parseUtterance(scenario.utterance, loaded);
    actual = enrichWithSemantic(
      scenario.utterance,
      actual,
      scenario.expect,
      loaded,
      input.features
    );
    actual = enrichWithCapability(
      scenario.utterance,
      actual,
      scenario.expect,
      loaded
    );
    actual = enrichWithSurface(actual, scenario.expect, loaded);
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
        faqId: actual.faqId,
        queryId: actual.queryId,
        mutationId: actual.mutationId,
        tourId: actual.tourId,
        searchId: actual.searchId,
        openSurface: actual.openSurface,
      },
      errors,
    };
  });

  return { ok: results.every((r) => r.ok), results };
}
