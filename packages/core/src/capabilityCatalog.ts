import {
  bestAliasContentCoverage,
  contentTokens,
  normalizeAsk,
} from './askNormalize.js';
import { hasTokenBoundaryMatch } from './fuzzyText.js';
import {
  anyReTest,
  DEFAULT_HEURISTICS,
  type CompiledHeuristics,
} from './heuristics.js';
import type { ChatChoice, ChatMessageLink, StepId } from './types.js';

function resolveH(h?: CompiledHeuristics | null): CompiledHeuristics {
  return h ?? DEFAULT_HEURISTICS;
}

export type QueryDef = {
  id: string;
  title: string;
  aliases: string[];
  slots?: string[];
  answerHint?: string;
  stepId?: StepId;
};

export type MutationRisk = 'low' | 'high';

export type MutationDef = {
  id: string;
  title: string;
  aliases: string[];
  risk: MutationRisk;
  confirmPrompt?: string;
  slots?: string[];
  stepId?: StepId;
};

export type TourDef = {
  id: string;
  title: string;
  aliases: string[];
  /** Ordered step ids (or coach lines only when host interprets). */
  steps: StepId[];
  lines?: string[];
};

export type SearchSurfaceDef = {
  id: string;
  title: string;
  aliases: string[];
  path?: string;
  stepId?: StepId;
};

export type QueryAnswer = {
  text: string;
  facts?: Record<string, string | number | null | undefined>;
  choices?: ChatChoice[];
  links?: ChatMessageLink[];
  navigatePath?: string;
  stepId?: StepId;
};

export type MutationPreview = {
  text: string;
  /** When true, host already needs an explicit confirm utterance / chip. */
  needsConfirm: boolean;
  slots?: Record<string, unknown>;
  stepId?: StepId;
  navigatePath?: string;
};

export type ResolveQueryFn = (req: {
  queryId: string;
  text: string;
  slots: Record<string, unknown>;
  ctx: { pathname: string; data: Record<string, unknown> };
}) => QueryAnswer | null | Promise<QueryAnswer | null>;

export type PreviewMutationFn = (req: {
  mutationId: string;
  text: string;
  slots: Record<string, unknown>;
  ctx: { pathname: string; data: Record<string, unknown> };
}) => MutationPreview | null | Promise<MutationPreview | null>;

export type ExecuteMutationFn = (req: {
  mutationId: string;
  text: string;
  slots: Record<string, unknown>;
  ctx: { pathname: string; data: Record<string, unknown> };
}) => QueryAnswer | null | Promise<QueryAnswer | null>;

export type RunTourFn = (req: {
  tourId: string;
  text: string;
  ctx: { pathname: string; data: Record<string, unknown> };
}) => QueryAnswer | null | Promise<QueryAnswer | null>;

export type OpenSearchHitFn = (req: {
  searchId: string;
  text: string;
  ctx: { pathname: string; data: Record<string, unknown> };
}) => QueryAnswer | null | Promise<QueryAnswer | null>;

type AliasCatalog = { id: string; aliases: string[]; title?: string };

/** Min content-token coverage for fuzzy multi-word alias hits. */
const ALIAS_COVERAGE_MIN = 0.84;

export function matchAliasCatalogEntry<T extends AliasCatalog>(
  catalog: T[],
  utterance: string
): T | null {
  const needle = normalizeAsk(utterance);
  if (!catalog.length || !needle) return null;
  let best: T | null = null;
  let bestScore = 0;
  for (const entry of catalog) {
    const labels = [entry.id, entry.title ?? '', ...entry.aliases]
      .map((a) => a.toLowerCase().trim())
      .filter(Boolean);
    for (const label of labels) {
      if (needle === label) return entry;
      const boundary =
        hasTokenBoundaryMatch(needle, label) || hasTokenBoundaryMatch(label, needle);
      const looseMulti =
        label.includes(' ') && (needle.includes(label) || label.includes(needle));
      const coverage = label.includes(' ')
        ? bestAliasContentCoverage(needle, label)
        : 0;
      // Require ≥2 content tokens so short FAQ aliases ("who are you"→"who")
      // cannot swallow clear OOD asks like "who won the world series".
      const labelTokens = contentTokens(label);
      const covered =
        coverage >= ALIAS_COVERAGE_MIN &&
        labelTokens.length >= 2 &&
        Math.round(coverage * labelTokens.length) >= 2;
      // Mutation / create prefix: "spin up a tournament named X" hits alias "...named".
      const prefixHit =
        label.includes(' ') &&
        (needle === label ||
          needle.startsWith(`${label} `) ||
          (/\b(named|called|titled|labeled|for)\s*$/.test(label) &&
            needle.startsWith(label)));
      if (boundary || looseMulti || covered || prefixHit) {
        const score =
          label.length +
          (boundary ? 50 : 0) +
          (covered ? Math.round(coverage * 40) : 0) +
          (prefixHit ? 60 : 0);
        if (score > bestScore) {
          best = entry;
          bestScore = score;
        }
      }
    }
  }
  return best;
}

export function matchQueryEntry(queries: QueryDef[], utterance: string): QueryDef | null {
  return matchAliasCatalogEntry(queries, utterance);
}

export function matchMutationEntry(
  mutations: MutationDef[],
  utterance: string
): MutationDef | null {
  return matchAliasCatalogEntry(mutations, utterance);
}

export function matchTourEntry(tours: TourDef[], utterance: string): TourDef | null {
  return matchAliasCatalogEntry(tours, utterance);
}

export function matchSearchEntry(
  search: SearchSurfaceDef[],
  utterance: string
): SearchSurfaceDef | null {
  return matchAliasCatalogEntry(search, utterance);
}

/** Confirm / yes utterances for pending high-risk mutations. */
export function looksLikeConfirmYes(
  text: string,
  heuristics?: CompiledHeuristics | null
): boolean {
  const re = resolveH(heuristics).confirmYes;
  return Boolean(re?.test(text.trim()));
}

export function looksLikeConfirmNo(
  text: string,
  heuristics?: CompiledHeuristics | null
): boolean {
  const re = resolveH(heuristics).confirmNo;
  return Boolean(re?.test(text.trim()));
}

/** Heuristic: user wants an explanation of the last assistant action. */
export function looksLikeExplainLast(
  text: string,
  extraPhrases?: readonly string[] | null,
  heuristics?: CompiledHeuristics | null
): boolean {
  const h = resolveH(heuristics);
  const n = normalizeAsk(text, heuristics);
  if (h.explainLastExact.has(n) || anyReTest(h.explainLast, n)) return true;
  return phrasesHit(n, extraPhrases, heuristics);
}

/** Heuristic: page/form context help. */
export function looksLikeContextAsk(
  text: string,
  extraPhrases?: readonly string[] | null,
  heuristics?: CompiledHeuristics | null
): boolean {
  const h = resolveH(heuristics);
  const n = normalizeAsk(text, heuristics);
  if (anyReTest(h.contextAsk, n)) return true;
  return phrasesHit(n, extraPhrases, heuristics);
}

function phrasesHit(
  normalized: string,
  phrases?: readonly string[] | null,
  heuristics?: CompiledHeuristics | null
): boolean {
  if (!phrases?.length) return false;
  for (const raw of phrases) {
    const p = normalizeAsk(raw, heuristics);
    if (p && normalized.includes(p)) return true;
  }
  return false;
}

/**
 * Desk / standup handoff phrasing (routes to query catalog when present).
 * Empty pack patterns → always false (no host desk jargon in core).
 */
export function looksLikeDeskHandoff(
  text: string,
  heuristics?: CompiledHeuristics | null
): boolean {
  const h = resolveH(heuristics);
  if (!h.deskHandoff.length) return false;
  const n = normalizeAsk(text, heuristics);
  return anyReTest(h.deskHandoff, n);
}

/**
 * True when the utterance matches a typed catalog (query/mutation/tour/search)
 * or FAQ / context / explain-last heuristics. Hosts use this to prefer System One
 * catalogs over entity-open adapters.
 */
export function utteranceMatchesTypedCatalog(
  pack: {
    queries?: QueryDef[];
    mutations?: MutationDef[];
    tours?: TourDef[];
    search?: SearchSurfaceDef[];
    faq?: { id: string; aliases: string[] }[];
    contextAskPhrases?: string[];
    explainLastPhrases?: string[];
    compiledHeuristics?: CompiledHeuristics;
    normalize?: {
      contextAskPhrases?: string[];
      explainLastPhrases?: string[];
    };
  },
  utterance: string
): boolean {
  const trimmed = utterance.trim();
  if (!trimmed) return false;
  const contextPhrases =
    pack.contextAskPhrases ?? pack.normalize?.contextAskPhrases;
  const explainPhrases =
    pack.explainLastPhrases ?? pack.normalize?.explainLastPhrases;
  const h = pack.compiledHeuristics;
  if (
    looksLikeContextAsk(trimmed, contextPhrases, h) ||
    looksLikeExplainLast(trimmed, explainPhrases, h)
  ) {
    return true;
  }
  if (matchQueryEntry(pack.queries ?? [], trimmed)) return true;
  if (matchMutationEntry(pack.mutations ?? [], trimmed)) return true;
  if (matchTourEntry(pack.tours ?? [], trimmed)) return true;
  if (matchSearchEntry(pack.search ?? [], trimmed)) return true;
  // FAQ: avoid pulling in glossary — callers pass pack.faq; match via aliases only.
  const faq = pack.faq ?? [];
  if (faq.length && matchAliasCatalogEntry(faq, trimmed)) return true;
  return false;
}
