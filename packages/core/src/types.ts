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
  /**
   * Hide when any rule matches. String = truthy `ctx.data[key]`;
   * object = binder predicate (`path` / `all` / `any`).
   */
  hideWhen?: Array<string | BinderPredicate>;
  /**
   * Show only when every rule matches (same rule shapes as hideWhen).
   * Combined with hideWhen: hide wins if both would apply.
   */
  showWhen?: Array<string | BinderPredicate>;
  /** Nested subgraph id (see PackJsonInput.subgraphs). */
  subgraph?: string;
};

/** Stable SPA interactable roles (pack `controls[].role`). */
export const CONTROL_ROLES = [
  'cta',
  'field',
  'tab',
  'nav',
  'row',
  'drawer',
  'menu',
  'dialog',
  'step',
  'combobox',
  'upload',
] as const;

export type ControlRole = (typeof CONTROL_ROLES)[number];

export type NavResolve = {
  path: string;
  search?: string;
  openModal?: string;
  /**
   * Host-defined non-modal surface key (drawer, wizard, upload panel).
   * Hosts bridge via `openSurface` on UiPilotProvider.
   */
  openSurface?: string;
  /** Optional step id associated with the openSurface request. */
  surfaceStep?: string;
  spotlight?: string;
  coachMessage?: string;
  prefill?: SlotBag;
  /** Guide ids the user must fill — coach tours them (cannot type for the user). */
  userFill?: string[];
  /**
   * When true, launch opens the create/edit surface (modal) and coaches missing
   * fields rather than only spotlighting a CTA.
   */
  coachCreate?: boolean;
  role?: ControlRole;
  /** Session draft bag key shared by coach prefill + host forms. */
  draftKey?: string;
  /** Pluggable draft compiler id registered by the host. */
  compilerId?: string;
  /** Guide ids to click before navigate/spotlight (tabs, menu openers). */
  beforeOpen?: string[];
  /** Menu trigger guide id (prepended to beforeOpen). */
  openMenu?: string;
  /** Host confirm dialog guide id (distinct from chat confirm gate). */
  confirmDialog?: string;
  /** Never auto-fill (file upload / ambiguous combobox). */
  spotlightOnly?: boolean;
  /**
   * Instruct-only: spotlight / message the user; never auto-submit uploads
   * or pick ambiguous combobox values. Implies spotlight-only behavior.
   */
  instructOnly?: boolean;
  wizardId?: string;
  wizardPage?: number;
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
  /** Optional lifecycle phase (setup vs run) for checklist chrome. */
  phase?: string;
  phaseLabel?: string;
};

/** Clickable reply options (disambiguation / next-up). */
export type ChatChoice = {
  id: string;
  label: string;
};

/** Multi-turn coach prompts awaiting the next user utterance. */
export type PendingPrompt =
  | {
      kind: 'ask_slot';
      stepId: StepId;
      slotKey: string;
      /** Slots collected so far for this step. */
      slots: SlotBag;
    }
  | { kind: 'confirm'; stepId: StepId; slots: SlotBag }
  | { kind: 'proactive'; stepId: StepId };

/** Short-term discourse for anaphora (“that”, “again”, “the other one”). */
export type DiscourseState = {
  lastStepId?: StepId;
  lastEntityName?: string;
  lastEntityId?: string;
  lastChoiceIds?: string[];
  /** Round-robin cursor for reply-bank variants. */
  replyCursor?: number;
  /** Last coach capability action (audit / explain_last). */
  lastCoachAction?: { kind: string; id: string; summary: string };
};

export type SlotAskDef = {
  key: string;
  ask: string;
  required?: boolean;
};

/** Pack reply banks — keys like `launch`, `launch.create_list`, `confirm`, `proactive`. */
export type ReplyBank = Record<string, string[]>;

export type ChatMessageLink = {
  label: string;
  href?: string;
  /** Host/chrome action — e.g. open_checklist. */
  action?: string;
};

export type ChatMessage = {
  id: string;
  role: 'assistant' | 'user' | 'system';
  text: string;
  at: number;
  choices?: ChatChoice[];
  links?: ChatMessageLink[];
  intentKey?: string;
  /** Pending decision-fallback bubble (e.g. Thinking…). */
  status?: 'thinking' | 'final';
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
  /** Optional help link rendered in chat. */
  href?: string;
  /** Optional chrome action (e.g. open_checklist). */
  action?: string;
  label?: string;
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
  /** Dot path on each entity for optional status filter. */
  statusField?: string;
  /** Allowed status values when statusField is set. */
  statusAllow?: string[];
  /** Dot path under ctx.data; when truthy, lookup is enabled. */
  filterPath?: string;
  /** Navigate template with `{{id}}` after a hit (host navigate). */
  openPathTemplate?: string;
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

/** Portable System One decision heads (optional; ranker / hybrid). */
export type ParseDecisionHeads = {
  /** Renormalized P(goto:step) over shortlist / step labels. */
  stepDist: Array<{ stepId: StepId; probability: number }>;
  /** FAQ entry masses when known. */
  faqDist: Array<{ faqId: string; probability: number }>;
  /** P(utterance is question-shaped / FAQ-seeking). */
  isQuestion: number;
  /** P(out-of-domain / unknown). */
  isOod: number;
};

export type ParseUtteranceOpts = {
  pathname?: string;
  shortlistStepIds?: StepId[];
  data?: Record<string, unknown>;
};

export type ParseUtteranceResult = {
  stepId: StepId | null;
  /** Near-tied step matches when the utterance is ambiguous across contexts. */
  candidates?: StepId[];
  slotPatches: SlotBag;
  isCorrection: boolean;
  goBack: boolean;
  rawIntent: string | null;
  /** Rule-score tier / calibrated band from probability. */
  confidence?: 'high' | 'mid' | 'low';
  /** Calibrated top-decision probability in [0, 1] when known. */
  probability?: number;
  /** Optional parallel decision heads (telemetry / tests). */
  decision?: ParseDecisionHeads;
  /** When FAQ matching wins at parse time. */
  faqId?: string;
  /** Typed data-query catalog id. */
  queryId?: string;
  /** Typed mutation catalog id. */
  mutationId?: string;
  /** Tour catalog id. */
  tourId?: string;
  /** Search surface catalog id. */
  searchId?: string;
};

/** Structured coach telemetry for hosts (no secrets / raw credentials). */
export type CoachEvent =
  | { type: 'utterance'; textLength: number }
  | { type: 'pending'; kind: PendingPrompt['kind']; stepId?: StepId }
  | { type: 'blocked'; stepId: StepId; missing: StepId[] }
  | {
      type: 'repair';
      kind: 'ambiguous' | 'unknown' | 'low_confidence' | 'blocked';
      /** Utterance text for NLU miss tuning (capped by miss-log pipeline). */
      text?: string;
      rawIntent?: string | null;
      confidence?: 'high' | 'mid' | 'low';
    }
  | {
      type: 'launch';
      stepId: StepId;
      gated?: boolean;
      correction?: boolean;
      /** Utterance text for hit logging (capped by conversation pipeline). */
      text?: string;
      rawIntent?: string | null;
      confidence?: 'high' | 'mid' | 'low';
    }
  | { type: 'confirm_ask'; stepId: StepId }
  | { type: 'slot_ask'; stepId: StepId; slotKey: string };

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
  pending?: PendingPrompt | null;
  discourse?: DiscourseState;
  /** Nested DAG currently scoping NLU / availability. */
  activeSubgraphId?: string | null;
  /** Stack of parent step ids that opened nested subgraphs. */
  subgraphStack?: StepId[];
};

export type AssistantFeatures = {
  chat?: boolean;
  palette?: boolean;
  spotlight?: boolean;
  voice?: boolean;
  checklist?: boolean;
  /**
   * When true (or UIPILOT_ONNX_RANKER=1), prefer the corpus-trained ONNX/JSON
   * intent+slot ranker instead of rules-only parseUtterance.
   */
  onnxRanker?: boolean;
  /** Kill switch when a missLog transport is also provided on the host. */
  missLog?: boolean;
  /**
   * Kill switch when a conversationLog transport is also provided on the host.
   * Default on when transport is wired.
   */
  conversationLog?: boolean;
  /**
   * Learning Mode: on miss, call host `fallbackLlm` and log MissExchange.
   * Prefer `layaDecisionFallback` (default on when host wires fallback).
   */
  learningMode?: boolean;
  /**
   * Decision fallback (Laya): call host `fallbackLlm` on miss.
   * **Default on** when unset — set `false` to force offline-only.
   * Env hint for hosts: `UIPILOT_LAYA_ENABLED=1`.
   */
  layaDecisionFallback?: boolean;
  /**
   * After Laya (`fallbackLlm`) refuses, call host `secondaryFallbackLlm`.
   * **Default off.** Requires both the feature flag and a wired secondary fn.
   * Host env hint: `UIPILOT_FALLBACK_LLM_ON_LAYA_MISS=yes`.
   */
  llmFallbackOnLayaMiss?: boolean;
  /**
   * When decision fallback returns a pack-validated goto, call `executeStep`
   * immediately (no choice chip). **Default on** when unset; set `false` for
   * chip-only UX.
   */
  autoExecuteTrustedGoto?: boolean;
  /**
   * Multimodal / vision fallback. **Default off.** Only call a vision-capable
   * secondary LLM when true and the host wires `visionFallbackLlm`.
   */
  visionFallback?: boolean;
};

export type CompletenessFn = (ctx: RuntimeContextBase) => boolean;

export type PackRuntime = {
  id: string;
  /** Shown in OOD canned replies ({{product_role}}). */
  productRole?: string;
  steps: FlowStepDef[];
  /** Nested flows keyed by subgraph id (parent step.subgraph). */
  subgraphs?: Record<string, FlowStepDef[]>;
  isComplete: Record<StepId, CompletenessFn>;
  resolveNav: (stepId: StepId, ctx: RuntimeContextBase) => NavResolve | null;
  unavailableReason?: (stepId: StepId, ctx: RuntimeContextBase) => string | null;
  glossary?: GlossaryEntry[];
  faq?: FaqEntry[];
  lookups?: LookupDef[];
  replies?: ReplyBank;
  /** Pack-driven utterance normalization. */
  normalize?: NormalizeConfig;
  /** Typed user/data read catalog (host `resolveQuery`). */
  queries?: import('./capabilityCatalog.js').QueryDef[];
  /** Confirm-gated write catalog (host preview/executeMutation). */
  mutations?: import('./capabilityCatalog.js').MutationDef[];
  /** Spotlight / step tour catalog. */
  tours?: import('./capabilityCatalog.js').TourDef[];
  /** Search / discovery surfaces. */
  search?: import('./capabilityCatalog.js').SearchSurfaceDef[];
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
  openSurface?: string;
  surfaceStep?: string;
  spotlight?: string;
  coachMessage?: string;
  role?: ControlRole;
  prefill?: SlotBag;
  /** Fields the coach cannot fill — sequential blink tour on step launch. */
  userFill?: string[];
  /** Open form/modal and coach required fills (create/edit flows). */
  coachCreate?: boolean;
  draftKey?: string;
  /** Pluggable draft compiler id (host registers DraftCompiler). */
  compilerId?: string;
  beforeOpen?: string[];
  openMenu?: string;
  confirmDialog?: string;
  spotlightOnly?: boolean;
  instructOnly?: boolean;
  wizardId?: string;
  wizardPage?: number;
};

export type IntentConfig = {
  aliases: Record<StepId, string[]>;
  meta?: string[];
  /** Required/optional slot asks before launching a step. */
  slots?: Record<StepId, SlotAskDef[]>;
  /** Steps that ask for confirmation before navigate/click. */
  confirm?: StepId[];
};

/** Pack-driven utterance normalization (synonyms / surfaces / open verbs). */
export type NormalizePhrasePair = {
  from: string;
  to: string;
};

export type NormalizeConfig = {
  replacements?: NormalizePhrasePair[];
  surfaceWords?: string[];
  trailingFillers?: string[];
  leadingPoliteness?: string[];
  openVerbAliases?: NormalizePhrasePair[];
  openVerbPrefixes?: string[];
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
  manifest: { id: string; productRole?: string };
  flow: FlowStepDef[];
  controls: ControlDef[];
  intents: IntentConfig;
  binders: Record<string, BinderPredicate>;
  glossary?: GlossaryEntry[];
  faq?: FaqEntry[];
  lookups?: LookupDef[];
  replies?: ReplyBank;
  /** Nested DAGs keyed by id; referenced via FlowStepDef.subgraph. */
  subgraphs?: Record<string, FlowStepDef[]>;
  /** Utterance normalization synonyms (surfaces, open verbs, typos). */
  normalize?: NormalizeConfig;
  queries?: import('./capabilityCatalog.js').QueryDef[];
  mutations?: import('./capabilityCatalog.js').MutationDef[];
  tours?: import('./capabilityCatalog.js').TourDef[];
  search?: import('./capabilityCatalog.js').SearchSurfaceDef[];
};

/** Host-registered NL → draft patch compiler (no domain types in core). */
export type DraftCompileResult = {
  draft: SlotBag;
  summary?: string;
  finishRequested?: boolean;
};

export type DraftCompiler = {
  id: string;
  match: (text: string) => boolean;
  compile: (text: string, current: SlotBag | null) => DraftCompileResult | null;
  listMissing: (draft: SlotBag) => Array<{ key: string; label: string }>;
};

export type IntentParsePack = {
  steps: FlowStepDef[];
  aliases: Record<StepId, string[]>;
  meta?: string[];
  /** Optional FAQ catalog for first-class FAQ parse hits. */
  faq?: FaqEntry[];
  /** Optional pack normalize config for synonym / surface handling. */
  normalize?: NormalizeConfig;
};

export type PackedUtteranceResult = {
  actions: GuideAction[];
  meta: ParseUtteranceResult | null;
};

export type LoadedPack = PackRuntime & IntentConfig;
