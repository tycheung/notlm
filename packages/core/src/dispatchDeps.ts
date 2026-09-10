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
  pack: IntentParsePack
) => ParseUtteranceResult | Promise<ParseUtteranceResult>;

export type DispatchDeps = {
  text: string;
  pack: LoadedPack;
  session: SessionSlots;
  ctx: { pathname: string; data: Record<string, unknown> };
  pushAssistant: (text: string, opts?: { choices?: ChatChoice[] }) => void;
  executeStep: (stepId: StepId, opts?: Record<string, unknown>) => void;
  setSession: (updater: (session: SessionSlots) => SessionSlots) => void;
  /** Optional: flash a glossary / row guide id (DOM). */
  flashField?: (guideId: string) => void;
  /** Optional: click a row/control guide id (DOM). */
  clickField?: (guideId: string) => void;
  /**
   * Optional utterance parser (e.g. ONNX/JSON ranker hybrid).
   * Defaults to rule-based parseUtterance.
   */
  parseUtteranceFn?: ParseUtteranceFn;
  /** Optional structured telemetry (no secrets). */
  onCoachEvent?: (event: CoachEvent) => void;
};
