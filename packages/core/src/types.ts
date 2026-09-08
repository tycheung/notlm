/**
 * Portable uipilot core types.
 * Domain step ids are opaque strings defined by packs — not VB GuideStepId unions.
 */

export type StepId = string;

export type StepKind = 'hard' | 'soft' | 'optional' | 'conditional';

export type SlotBag = Record<string, unknown>;

export type FlowStepDef = {
  id: StepId;
  title: string;
  keywords: string[];
  kind: StepKind;
  /** Hard dependencies — step unavailable until all complete (and not stale). */
  requires: StepId[];
  /** Soft preferences; also used for stale fan-out after corrections. */
  prefers?: StepId[];
  /** Pack-defined hide rules evaluated against RuntimeContext. */
  hideWhen?: string[];
};

export type NavResolve = {
  path: string;
  search?: string;
  openModal?: string;
  spotlight?: string;
  coachMessage?: string;
  prefill?: SlotBag;
  /** Guide ids the user must fill — coach tours them (cannot type for the user). */
  userFill?: string[];
};

export type RuntimeContextBase = {
  /** Current location (path + search) for page bias / skip-launch. */
  pathname: string;
  /** Opaque bag filled by host/pack binders. */
  data: Record<string, unknown>;
};

export type StepStatus = {
  id: StepId;
  title: string;
  kind: StepKind;
  complete: boolean;
  available: boolean;
  blockedReason: string | null;
  stale: boolean;
};

/** Clickable reply options (disambiguation / next-up). */
export type ChatChoice = {
  id: StepId;
  label: string;
};

export type ChatMessage = {
  id: string;
  role: 'assistant' | 'user' | 'system';
  text: string;
  at: number;
  choices?: ChatChoice[];
};

/** Optional pack glossary for explain_field. */
export type GlossaryEntry = {
  id: string;
  aliases: string[];
  text: string;
  guideId?: string;
};

/** Product Q&A (blurb-led) — answered without navigating a flow step. */
export type FaqEntry = {
  id: string;
  aliases: string[];
  text: string;
  /** Optional: offer to take the user to this step after answering. */
  stepId?: StepId;
};

/** Pack-declared entity lookup against host-published RuntimeContext.data arrays. */
export type LookupDef = {
  id: string;
  /** Dot path under `ctx.data` to an array of entities. */
  dataPath: string;
  nameKey?: string;
  idKey?: string;
  utteranceHints?: string[];
  entityWords?: string[];
  /** Template with `{{id}}` → guide id for spotlight/flash. */
  guideIdTemplate?: string;
  /** Optional nav step after a hit. */
  stepId?: StepId;
};

export type LookupEntityHit = {
  id: string;
  name: string;
  guideId?: string;
  stepId?: StepId;
};

export type LookupMatchResult =
  | { kind: 'none' }
  | { kind: 'miss'; lookupId: string; query: string }
  | { kind: 'hit'; lookupId: string; query: string; entity: LookupEntityHit }
  | {
      kind: 'ambiguous';
      lookupId: string;
      query: string;
      candidates: LookupEntityHit[];
    };

export type ParseUtteranceResult = {
  stepId: StepId | null;
  /** Near-tied step matches when the utterance is ambiguous across contexts. */
  candidates?: StepId[];
  slotPatches: SlotBag;
  isCorrection: boolean;
  goBack: boolean;
  rawIntent: string | null;
};

export type GuideAction = {
  stepId: StepId;
  slots: SlotBag;
  rawSegment: string;
};

export type SessionSlots = {
  byStep: Record<StepId, SlotBag>;
  history: StepId[];
  activeStep: StepId | null;
  stale: StepId[];
  actionQueue: GuideAction[];
  /** Pack/host opaque flags (e.g. skipped optional steps). */
  flags: Record<string, unknown>;
};

export type AssistantFeatures = {
  chat?: boolean;
  palette?: boolean;
  spotlight?: boolean;
  voice?: boolean;
  /**
   * When true (or UIPILOT_ONNX_RANKER=1), prefer the corpus-trained ONNX/JSON
   * intent+slot ranker instead of rules-only parseUtterance.
   */
  onnxRanker?: boolean;
};

export type CompletenessFn = (ctx: RuntimeContextBase) => boolean;

export type PackRuntime = {
  id: string;
  steps: FlowStepDef[];
  isComplete: Record<StepId, CompletenessFn>;
  resolveNav: (stepId: StepId, ctx: RuntimeContextBase) => NavResolve | null;
  unavailableReason?: (stepId: StepId, ctx: RuntimeContextBase) => string | null;
  glossary?: GlossaryEntry[];
  faq?: FaqEntry[];
  lookups?: LookupDef[];
};

export type BinderOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'truthy' | 'falsy';

export type BinderPredicate =
  | { path: string; op: BinderOp; value?: unknown }
  | { all: BinderPredicate[] }
  | { any: BinderPredicate[] };

export type ControlDef = {
  id: string;
  stepId: StepId;
  path?: string;
  openModal?: string;
  spotlight?: string;
  coachMessage?: string;
  prefill?: SlotBag;
  /** Fields the coach cannot fill — sequential blink tour on step launch. */
  userFill?: string[];
};

export type IntentConfig = {
  aliases: Record<StepId, string[]>;
  meta?: string[];
};

export type ScenarioCase = {
  utterance: string;
  expect: {
    stepId?: StepId | null;
    rawIntent?: string | null;
    goBack?: boolean;
    isCorrection?: boolean;
    slots?: SlotBag;
  };
};

export type NavSkipEntry = {
  id: StepId;
  title: string;
  keywords: string[];
};

export type PackJsonInput = {
  manifest: { id: string };
  flow: FlowStepDef[];
  controls: ControlDef[];
  intents: IntentConfig;
  binders: Record<string, BinderPredicate>;
  glossary?: GlossaryEntry[];
  faq?: FaqEntry[];
  lookups?: LookupDef[];
};

export type IntentParsePack = {
  steps: FlowStepDef[];
  aliases: Record<StepId, string[]>;
  meta?: string[];
};

export type PackedUtteranceResult = {
  actions: GuideAction[];
  meta: ParseUtteranceResult | null;
};

export type LoadedPack = PackRuntime & IntentConfig;
