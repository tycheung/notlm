/**
 * Typed capability catalogs: queries (reads), mutations (confirm-gated writes),
 * tours, and search surfaces. Hosts execute; core only matches + dispatches.
 */
import { hasTokenBoundaryMatch } from './fuzzyText.js';
import type { ChatChoice, ChatMessageLink, StepId } from './types.js';

export type QueryDef = {
  id: string;
  title: string;
  aliases: string[];
  /** Optional slot keys the host may extract from the utterance. */
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

function normalizeAsk(utterance: string): string {
  let n = utterance
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < 3; i++) {
    const next = n.replace(/^(uhh?|umm?|er|ah|like|so|well|okay|ok|hey|yo|pls)\s+/, '');
    if (next === n) break;
    n = next;
  }
  return n;
}

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
      if (boundary || looseMulti) {
        const score = label.length + (boundary ? 50 : 0);
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
export function looksLikeConfirmYes(text: string): boolean {
  return /^(yes|yep|yeah|y|ok|okay|sure|confirm|do it|go ahead|proceed)\b/i.test(
    text.trim()
  );
}

export function looksLikeConfirmNo(text: string): boolean {
  return /^(no|nope|nah|cancel|stop|never ?mind|don't)\b/i.test(text.trim());
}

/** Heuristic: user wants an explanation of the last coach action. */
export function looksLikeExplainLast(text: string): boolean {
  const n = normalizeAsk(text);
  return (
    /\b(what did you (just )?(do|open|change)|why did you|explain (that|what you did)|what would that change)\b/.test(
      n
    ) || n === 'what was that'
  );
}

/** Heuristic: page/form context help. */
export function looksLikeContextAsk(text: string): boolean {
  const n = normalizeAsk(text);
  return (
    /\b(why can'?t i (save|submit|continue)|what'?s missing|what do i need|why is (this|the) (blocked|disabled)|where am i|what (is|are) (on )?this (page|screen|form))\b/.test(
      n
    )
  );
}
