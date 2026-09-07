/**
 * Portable workflow-assistant core types.
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

export type ChatMessage = {
  id: string;
  role: 'assistant' | 'user' | 'system';
  text: string;
  at: number;
};

export type ParseUtteranceResult = {
  stepId: StepId | null;
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
};

export type CompletenessFn = (ctx: RuntimeContextBase) => boolean;

export type PackRuntime = {
  id: string;
  steps: FlowStepDef[];
  isComplete: Record<StepId, CompletenessFn>;
  resolveNav: (stepId: StepId, ctx: RuntimeContextBase) => NavResolve | null;
  unavailableReason?: (stepId: StepId, ctx: RuntimeContextBase) => string | null;
};
