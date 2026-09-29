import type {
  ChatChoice,
  CoachEvent,
  IntentParsePack,
  LoadedPack,
  ParseUtteranceResult,
  SessionSlots,
  StepId,
} from './types.js';

export type ParseUtteranceFn = (
  text: string,
  pack: IntentParsePack,
  opts?: import('./types.js').ParseUtteranceOpts
) => ParseUtteranceResult | Promise<ParseUtteranceResult>;

export type DispatchDeps = {
  text: string;
  pack: LoadedPack;
  session: SessionSlots;
  ctx: { pathname: string; data: Record<string, unknown> };
  pushAssistant: (
    text: string,
    opts?: {
      choices?: ChatChoice[];
      links?: import('./types.js').ChatMessageLink[];
      intentKey?: string;
    }
  ) => void;
  executeStep: (stepId: StepId, opts?: Record<string, unknown>) => void;
  setSession: (updater: (session: SessionSlots) => SessionSlots) => void;
  /** Optional: flash a glossary / row guide id (DOM). */
  flashField?: (guideId: string) => void;
  /** Optional: click a row/control guide id (DOM). */
  clickField?: (guideId: string) => void;
  /** Optional: navigate after lookup openPathTemplate. */
  navigate?: (path: string) => void;
  /**
   * Optional utterance parser (e.g. ONNX/JSON ranker hybrid).
   * Defaults to rule-based parseUtterance.
   */
  parseUtteranceFn?: ParseUtteranceFn;
  /** Session phrase LRU (hot-path cache over local/Laya decisions). */
  phraseLru?: import('./phraseLru.js').PhraseLruStore;
  /** Host-registered draft compilers keyed by compilerId. */
  draftCompilers?: Record<string, import('./types.js').DraftCompiler>;
  /** Persist/apply a compiled draft (UI-actions / host save). */
  onApplyDraft?: (draftKey: string, draft: Record<string, unknown>) => void | Promise<void>;
  /** Optional structured telemetry (no secrets). */
  onCoachEvent?: (event: CoachEvent) => void;
  /** Skip canned repair copy when Laya/LLM fallback will answer (unknown/ambiguous). */
  deferDecisionFallbackUi?: boolean;
  /** Skip low-confidence Yes/No; emit repair for Laya→LLM when admin LLM fallback is on. */
  deferLowConfidenceToFallback?: boolean;
  /** Host typed data-query resolver. */
  resolveQuery?: import('./capabilityCatalog.js').ResolveQueryFn;
  previewMutation?: import('./capabilityCatalog.js').PreviewMutationFn;
  executeMutation?: import('./capabilityCatalog.js').ExecuteMutationFn;
  runTour?: import('./capabilityCatalog.js').RunTourFn;
  openSearchHit?: import('./capabilityCatalog.js').OpenSearchHitFn;
  /** Contextual “why can’t I save / what’s missing” host narrator. */
  resolveContextAsk?: (req: {
    text: string;
    ctx: { pathname: string; data: Record<string, unknown> };
    session: SessionSlots;
  }) => string | null;
};
