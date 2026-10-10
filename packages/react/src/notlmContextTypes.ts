import type {
  AssistantFeatures,
  ChatChoice,
  ChatMessage,
  ChatMessageLink,
  CoachEvent,
  ConversationTransport,
  DraftCompiler,
  ExecuteMutationFn,
  LlmFallbackFn,
  MissExchangeTransport,
  MissKind,
  MissLogTransport,
  OpenSearchHitFn,
  PackRuntime,
  ParseUtteranceFn,
  PreviewMutationFn,
  ResolveQueryFn,
  RunTourFn,
  RuntimeContextBase,
  SessionSlots,
  SlotBag,
  StepId,
  StepStatus,
} from '@notlm/core';
import type { CSSProperties, ReactNode } from 'react';
import type { NotLMChromeConfig } from './chromeTypes.js';
import type { SpotlightState } from './useSpotlightController.js';
import type { ChatThread } from './ThreadList.js';

export type NavigateFn = (path: string, opts?: { search?: string }) => void;
/** Host opens a pack-declared modal key (UI-actions only — no product APIs). */
export type OpenModalFn = (modalKey: string) => void;
/** Host opens a pack-declared surface key (drawer / upload / wizard). */
export type OpenSurfaceFn = (
  surfaceKey: string,
  surfaceStep?: string,
  opts?: { deleteList?: 'sa' | 'full' }
) => void;
export type OnWizardPageFn = (wizardId: string, page: number) => void;
export type EnrichStatusesFn = (
  statuses: StepStatus[],
  ctx: RuntimeContextBase
) => StepStatus[];

export type ExecuteStepOpts = {
  prefill?: SlotBag;
  skipCoach?: boolean;
  /**
   * Steps to treat as complete for requires checks (queue resume after notify
   * when getContext binders have not flushed yet).
   */
  assumeComplete?: StepId[];
  /** Force coach-create / modal open + missing-field tour. */
  coachCreate?: boolean;
  /** Override pack control openSurface (e.g. confirm dialogs). */
  forceOpenSurface?: string;
  forceSurfaceStep?: string | null;
  forceOpenModal?: string;
  /** Skip the step’s default openModal (surface-only launches). */
  skipOpenModal?: boolean;
  forceInstructOnly?: boolean;
};

export type NotLMContextValue = {
  pack: PackRuntime;
  getContext: () => RuntimeContextBase;
  navigate: NavigateFn;
  features: AssistantFeatures;
  session: SessionSlots;
  messages: ChatMessage[];
  statuses: StepStatus[];
  panelOpen: boolean;
  paletteOpen: boolean;
  checklistOpen: boolean;
  spotlight: SpotlightState;
  handleUserUtterance: (text: string) => void;
  pushAssistant: (
    text: string,
    opts?: { choices?: ChatChoice[]; links?: ChatMessageLink[]; intentKey?: string }
  ) => void;
  executeStep: (stepId: StepId, opts?: ExecuteStepOpts) => void;
  notifyStepCompleted: (stepId: StepId) => void;
  setPanelOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  setChecklistOpen: (open: boolean) => void;
  clearSpotlight: () => void;
  chrome: NotLMChromeConfig;
  hostRootStyle: CSSProperties;
  hostRootClassName: string;
  fallbackBusy: boolean;
  /** Busy or async fallback owns the turn pin (pre-Thinking included). */
  fallbackInFlight: boolean;
  /** Bumps when cancel/preempt should drop composer `queuedWhileBusy`. */
  composerQueueBustGen: number;
  cancelFallback: (opts?: { skipSettleRepair?: boolean }) => void;
  regenerateLastFallback: () => void;
  threads: ChatThread[];
  activeThreadId: string;
  selectThread: (id: string) => void;
  newThread: () => void;
};

export type NotLMProviderProps = {
  pack: PackRuntime;
  getContext: () => RuntimeContextBase;
  navigate: NavigateFn;
  openModal?: OpenModalFn;
  openSurface?: OpenSurfaceFn;
  onWizardPage?: OnWizardPageFn;
  enrichStatuses?: EnrichStatusesFn;
  draftCompilers?: Record<string, DraftCompiler>;
  onApplyDraft?: (draftKey: string, draft: SlotBag) => void | Promise<void>;
  features?: AssistantFeatures;
  parseUtteranceFn?: ParseUtteranceFn;
  clearPendingChoices?: (text: string) => boolean | Promise<boolean>;
  tryHandleUtterance?: (text: string) => boolean | Promise<boolean>;
  onCoachEvent?: (event: CoachEvent) => void;
  missLog?: {
    transport: MissLogTransport;
    exchangeTransport?: MissExchangeTransport;
    kinds?: MissKind[];
    packId?: string;
    getPathname?: () => string | undefined;
  };
  conversationLog?: {
    transport: ConversationTransport;
    packId?: string;
    getPathname?: () => string | undefined;
  };
  fallbackLlm?: LlmFallbackFn;
  secondaryFallbackLlm?: LlmFallbackFn;
  resolveQuery?: ResolveQueryFn;
  previewMutation?: PreviewMutationFn;
  executeMutation?: ExecuteMutationFn;
  runTour?: RunTourFn;
  openSearchHit?: OpenSearchHitFn;
  resolveContextAsk?: (req: {
    text: string;
    ctx: RuntimeContextBase;
    session: SessionSlots;
  }) => string | null;
  children: ReactNode;
} & NotLMChromeConfig;
