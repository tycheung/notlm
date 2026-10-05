import {
  advanceAfterStepCompleted,
  composeCoachEventHandlers,
  createConversationLogPipeline,
  createMissLogPipeline,
  dispatchUserUtterance,
  emptySession,
  evaluateFlowStatuses,
  formatBlockedQueueMessage,
  isDecisionFallbackEnabled,
  isSecondaryLlmFallbackEnabled,
  listMissingRequires,
  markActiveStep,
  utteranceMatchesTypedCatalog,
  mintConversationId,
  createMemoryPhraseLru,
  type AssistantFeatures,
  type ChatChoice,
  type ChatMessage,
  type CoachEvent,
  type ConversationLogPipeline,
  type ConversationTransport,
  type LlmFallbackFn,
  type LoadedPack,
  type MissExchangeTransport,
  type MissKind,
  type MissLogTransport,
  type PackRuntime,
  type ParseUtteranceFn,
  type PhraseLruStore,
  type RuntimeContextBase,
  type SessionSlots,
  type SlotBag,
  type StepId,
  type StepStatus,
  type DraftCompiler,
  type ChatMessageLink,
  type ResolveQueryFn,
  type PreviewMutationFn,
  type ExecuteMutationFn,
  type RunTourFn,
  type OpenSearchHitFn,
} from '@notlm/core';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { NotLMChromeConfig } from './chromeTypes.js';
import { createDecisionFallbackHandler } from './decisionFallbackHandler.js';
import { DEFAULT_GUIDE_ATTR, flashGuideField, flashGuideFieldsSequential } from './fieldFlash.js';
import { applyPrefill } from './fieldPrefill.js';
import { clickGuide } from './clickGuide.js';
import { writeDraft } from './draftBridge.js';
import {
  coachCopyForRole,
  isSpotlightOnly,
  runBeforeOpen,
} from './guideInteract.js';
import { appearanceToCssVars } from './notlm.css.js';
import { useSpotlightController, type SpotlightState } from './useSpotlightController.js';
import { swallowDispatchError } from './hostTelemetry.js';

type NavigateFn = (path: string, opts?: { search?: string }) => void;
/** Host opens a pack-declared modal key (UI-actions only — no product APIs). */
export type OpenModalFn = (modalKey: string) => void;
/** Host opens a pack-declared surface key (drawer / upload / wizard). */
export type OpenSurfaceFn = (surfaceKey: string, surfaceStep?: string) => void;
export type OnWizardPageFn = (wizardId: string, page: number) => void;
export type EnrichStatusesFn = (statuses: StepStatus[], ctx: RuntimeContextBase) => StepStatus[];

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
};

function asLoadedPack(pack: PackRuntime): LoadedPack {
  const withIntents = pack as PackRuntime & {
    aliases?: Record<string, string[]>;
    meta?: string[];
  };
  return {
    ...pack,
    aliases: withIntents.aliases ?? {},
    meta: withIntents.meta,
  };
}

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
};

const NotLMContext = createContext<NotLMContextValue | null>(null);

function newMessage(
  role: ChatMessage['role'],
  text: string,
  choices?: ChatChoice[],
  extra?: { links?: ChatMessage['links']; intentKey?: string }
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    at: Date.now(),
    ...(choices?.length ? { choices } : {}),
    ...(extra?.links?.length ? { links: extra.links } : {}),
    ...(extra?.intentKey ? { intentKey: extra.intentKey } : {}),
  };
}

export type NotLMProviderProps = {
  pack: PackRuntime;
  getContext: () => RuntimeContextBase;
  navigate: NavigateFn;
  /** Optional: open host modal by key from controls.json `openModal`. */
  openModal?: OpenModalFn;
  /** Optional: open host surface by key from controls.json `openSurface`. */
  openSurface?: OpenSurfaceFn;
  /** Optional: host wizard page switch from controls wizardId/wizardPage. */
  onWizardPage?: OnWizardPageFn;
  /** Optional: enrich statuses with phase labels for checklist. */
  enrichStatuses?: EnrichStatusesFn;
  /** Host draft compilers keyed by control compilerId. */
  draftCompilers?: Record<string, DraftCompiler>;
  onApplyDraft?: (draftKey: string, draft: SlotBag) => void | Promise<void>;
  features?: AssistantFeatures;
  /** Optional hybrid / ONNX ranker parser (feature-flagged by host). */
  parseUtteranceFn?: ParseUtteranceFn;
  /**
   * Host adapter hook (format NLU, entity open, …).
   * Return true to skip core dispatch for this utterance.
   */
  clearPendingChoices?: (text: string) => boolean | Promise<boolean>;
  tryHandleUtterance?: (text: string) => boolean | Promise<boolean>;
  /** Optional structured coach telemetry (no secrets). */
  onCoachEvent?: (event: CoachEvent) => void;
  /**
   * Optional miss-log sink for unknown/ambiguous/low-confidence utterances.
   * Disabled when `features.missLog === false`.
   * When `exchangeTransport` is set, successful Learning Mode fallbacks also POST MissExchange.
   */
  missLog?: {
    transport: MissLogTransport;
    exchangeTransport?: MissExchangeTransport;
    kinds?: MissKind[];
    packId?: string;
    getPathname?: () => string | undefined;
  };
  /**
   * Optional conversation transcript sink (hits + misses under one conversationId).
   * Disabled when `features.conversationLog === false`. Default on when transport is wired.
   */
  conversationLog?: {
    transport: ConversationTransport;
    packId?: string;
    getPathname?: () => string | undefined;
  };
  /**
   * Host BYO decision fallback (Laya sidecar proxy). Used when
   * `features.layaDecisionFallback` is not false (default on).
   */
  fallbackLlm?: LlmFallbackFn;
  /**
   * Optional secondary LLM after Laya refuses. Used only when
   * `features.llmFallbackOnLayaMiss === true` (default off).
   */
  secondaryFallbackLlm?: LlmFallbackFn;
  /** Host typed capability resolvers (reads / writes / tours / search). */
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

export function NotLMProvider({
  pack,
  getContext,
  navigate,
  openModal,
  openSurface,
  onWizardPage,
  enrichStatuses,
  draftCompilers,
  onApplyDraft,
  features: featuresProp,
  parseUtteranceFn,
  clearPendingChoices,
  tryHandleUtterance,
  onCoachEvent,
  missLog,
  conversationLog,
  fallbackLlm,
  secondaryFallbackLlm,
  resolveQuery,
  previewMutation,
  executeMutation,
  runTour,
  openSearchHit,
  resolveContextAsk,
  appearance,
  className,
  classNames,
  components,
  labels,
  style,
  children,
}: NotLMProviderProps) {
  const features = useMemo<AssistantFeatures>(
    () => ({
      chat: true,
      palette: true,
      spotlight: true,
      voice: true,
      ...featuresProp,
    }),
    [featuresProp]
  );

  const conversationIdRef = useRef(mintConversationId());
  const conversationPipelineRef = useRef<ConversationLogPipeline | null>(null);
  const phraseLruRef = useRef<PhraseLruStore>(createMemoryPhraseLru());
  /** Filled after executeStep is defined; used by decision-fallback auto-nav. */
  const executeStepRef = useRef<(stepId: StepId, opts?: ExecuteStepOpts) => void>(
    () => {}
  );

  const [session, setSession] = useState<SessionSlots>(() => emptySession());
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    newMessage('assistant', 'How can I help? Ask for a workflow step or open the command palette.'),
  ]);

  const defaultPathname = useCallback(() => {
    try {
      return getContext().pathname;
    } catch {
      return undefined;
    }
  }, [getContext]);

  const coachEventHandler = useMemo(() => {
    const missEnabled = Boolean(missLog?.transport) && features.missLog !== false;
    const pipeline = missEnabled
      ? createMissLogPipeline({
          transport: missLog!.transport,
          kinds: missLog!.kinds,
          packId: missLog!.packId ?? pack.id,
          getPathname: missLog!.getPathname ?? defaultPathname,
        })
      : null;

    const convEnabled =
      Boolean(conversationLog?.transport) && features.conversationLog !== false;
    const convPipeline = convEnabled
      ? createConversationLogPipeline({
          transport: conversationLog!.transport,
          conversationId: conversationIdRef.current,
          packId: conversationLog!.packId ?? pack.id,
          getPathname: conversationLog!.getPathname ?? defaultPathname,
        })
      : null;
    conversationPipelineRef.current = convPipeline;

    const onFallbackMiss = createDecisionFallbackHandler({
      pack: asLoadedPack(pack),
      features,
      fallbackLlm,
      secondaryFallbackLlm,
      missLog,
      conversationLog,
      getContext,
      thinkingLabel: labels?.thinking ?? 'Thinking…',
      setMessages,
      setSession,
      sessionRef,
      executeStepRef,
      navigate,
      resolveQuery,
      previewMutation,
      executeMutation,
      runTour,
      openSearchHit,
    });

    return composeCoachEventHandlers(
      pipeline?.onCoachEvent,
      convPipeline?.onCoachEvent,
      onFallbackMiss,
      onCoachEvent
    );
  }, [
    conversationLog,
    defaultPathname,
    fallbackLlm,
    secondaryFallbackLlm,
    features,
    getContext,
    missLog,
    onCoachEvent,
    pack,
    labels?.thinking,
    navigate,
    resolveQuery,
    previewMutation,
    executeMutation,
    runTour,
    openSearchHit,
  ]);

  const chrome = useMemo<NotLMChromeConfig>(
    () => ({ appearance, className, classNames, components, labels, style }),
    [appearance, className, classNames, components, labels, style]
  );

  const hostRootStyle = useMemo<CSSProperties>(
    () => ({ ...appearanceToCssVars(appearance), ...style }),
    [appearance, style]
  );

  const hostRootClassName = ['notlm-host-root', className, classNames?.root]
    .filter(Boolean)
    .join(' ');

  const [panelOpen, setPanelOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const { spotlight, showSpotlight, clearSpotlight } = useSpotlightController(DEFAULT_GUIDE_ATTR);

  const ctx = getContext();
  const statuses = useMemo(() => {
    const base = evaluateFlowStatuses(pack, ctx, session.stale);
    return enrichStatuses ? enrichStatuses(base, ctx) : base;
  }, [pack, ctx, session.stale, enrichStatuses]);

  const pushAssistant = useCallback(
    (
      text: string,
      opts?: { choices?: ChatChoice[]; links?: ChatMessageLink[]; intentKey?: string }
    ) => {
      conversationPipelineRef.current?.logChat('assistant', text);
      setMessages((prev) => [
        ...prev,
        newMessage('assistant', text, opts?.choices, {
          links: opts?.links,
          intentKey: opts?.intentKey,
        }),
      ]);
    },
    []
  );

  const executeStep = useCallback(
    (stepId: StepId, opts?: ExecuteStepOpts) => {
      const loaded = asLoadedPack(pack);
      const liveCtx = getContext();
      const missing = listMissingRequires(
        loaded,
        stepId,
        liveCtx,
        sessionRef.current.stale,
        { assumeComplete: opts?.assumeComplete }
      );
      if (missing.length > 0) {
        pushAssistant(formatBlockedQueueMessage(loaded, stepId, missing));
        return;
      }
      const nav = loaded.resolveNav(stepId, liveCtx);
      if (!nav) {
        pushAssistant('I could not find where to go for that step.');
        return;
      }
      setSession((prev) => {
        const next = markActiveStep(prev, stepId);
        sessionRef.current = next;
        return next;
      });

      const mergedPrefill = { ...(nav.prefill ?? {}), ...(opts?.prefill ?? {}) };
      // Persist draft before CTA click so host controlled inputs see slots.
      if (nav.draftKey && Object.keys(mergedPrefill).length > 0) {
        writeDraft(pack.id, nav.draftKey, mergedPrefill);
      }

      runBeforeOpen(nav);
      if (nav.path) navigate(nav.path, nav.search ? { search: nav.search } : undefined);
      if (nav.openModal) openModal?.(nav.openModal);
      if (nav.openSurface) {
        openSurface?.(nav.openSurface, nav.surfaceStep ?? stepId);
      }
      if (nav.wizardId != null && nav.wizardPage != null) {
        onWizardPage?.(nav.wizardId, nav.wizardPage);
      }
      if (nav.confirmDialog) {
        queueMicrotask(() => {
          requestAnimationFrame(() => {
            flashGuideField(nav.confirmDialog!);
            clickGuide(nav.confirmDialog!);
          });
        });
      }
      const coachCreate = Boolean(opts?.coachCreate || nav.coachCreate || nav.openModal);
      const spotlightOnly = isSpotlightOnly(nav);
      const skipCoach =
        Boolean(opts?.skipCoach) ||
        coachCreate ||
        Boolean(nav.openModal) ||
        Boolean(nav.openSurface);
      const roleCopy = coachCopyForRole(nav, stepId);
      let coached = false;
      if (!skipCoach && nav.coachMessage) {
        pushAssistant(nav.coachMessage);
        coached = true;
      } else if (!skipCoach && roleCopy) {
        pushAssistant(roleCopy);
        coached = true;
      }
      if (!coachCreate && nav.spotlight && features.spotlight !== false) {
        showSpotlight(nav.spotlight, nav.coachMessage ?? roleCopy ?? `Focus: ${stepId}`);
      }
      if (nav.spotlight) {
        flashGuideField(nav.spotlight);
      }
      const draftOpts =
        nav.draftKey != null
          ? { packId: pack.id, draftKey: nav.draftKey }
          : undefined;
      if (Object.keys(mergedPrefill).length > 0) {
        queueMicrotask(() =>
          applyPrefill(mergedPrefill, {
            draft: draftOpts,
            skipDom: spotlightOnly,
          })
        );
      }
      const userFill = spotlightOnly ? [] : (nav.userFill?.filter(Boolean) ?? []);
      if (userFill.length > 0) {
        pushAssistant(
          userFill.length === 1
            ? 'Please fill in the highlighted field — I can’t type that for you.'
            : `Please fill in these ${userFill.length} fields — I’ll highlight each one from top to bottom.`
        );
        queueMicrotask(() => {
          flashGuideFieldsSequential(userFill, { onlyEmpty: false });
        });
      } else if (coachCreate && nav.openModal && !opts?.skipCoach) {
        // Re-open path: brief coach nudge when form has no userFill list.
        // Skip when caller already coached (capability/goto) via skipCoach.
        pushAssistant('Opening the form — fill what’s needed, then save.');
      } else if (spotlightOnly && nav.spotlight && !coached) {
        pushAssistant(
          nav.coachMessage ??
            roleCopy ??
            'Use the highlighted control yourself — I won’t fill that automatically.'
        );
      }
    },
    [features.spotlight, getContext, navigate, openModal, openSurface, onWizardPage, pack, pushAssistant, showSpotlight]
  );

  executeStepRef.current = executeStep;

  const notifyStepCompleted = useCallback(
    (stepId: StepId) => {
      const loaded = asLoadedPack(pack);
      const result = advanceAfterStepCompleted(
        loaded,
        sessionRef.current,
        getContext(),
        stepId
      );
      sessionRef.current = result.session;
      setSession(result.session);
      for (let i = 0; i < result.messages.length; i++) {
        const msg = result.messages[i]!;
        const choices =
          i === result.messages.length - 1 ? result.choices : undefined;
        pushAssistant(msg, choices?.length ? { choices } : undefined);
      }
      if (result.executeNext) {
        const next = result.executeNext;
        const assumeComplete = [stepId];
        // After opening A, B’s control often mounts on the next frame.
        queueMicrotask(() => {
          requestAnimationFrame(() => {
            executeStepRef.current(next.stepId, {
              prefill: next.slots,
              assumeComplete,
            });
          });
        });
      }
    },
    [getContext, pack, pushAssistant]
  );

  const handleUserUtterance = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      conversationPipelineRef.current?.logChat('user', trimmed);
      setMessages((prev) => [...prev, newMessage('user', trimmed)]);
      setPanelOpen(true);

      const runCore = () => {
        const decisionFallbackOn =
          Boolean(fallbackLlm) && isDecisionFallbackEnabled(features);
        const secondaryOn =
          Boolean(secondaryFallbackLlm) && isSecondaryLlmFallbackEnabled(features);
        const result = dispatchUserUtterance({
          text: trimmed,
          pack: asLoadedPack(pack),
          session: sessionRef.current,
          ctx: getContext(),
          pushAssistant,
          executeStep: executeStepRef.current,
          setSession: (updater) => {
            setSession((prev) => {
              const next = updater(prev);
              sessionRef.current = next;
              return next;
            });
          },
          flashField: (guideId) => {
            flashGuideField(guideId);
          },
          clickField: (guideId) => {
            clickGuide(guideId);
          },
          navigate: (path) => navigate(path),
          parseUtteranceFn,
          phraseLru: phraseLruRef.current,
          draftCompilers,
          onApplyDraft,
          onCoachEvent: coachEventHandler,
          deferDecisionFallbackUi: decisionFallbackOn,
          deferLowConfidenceToFallback: secondaryOn,
          resolveQuery,
          previewMutation,
          executeMutation,
          runTour,
          openSearchHit,
          resolveContextAsk,
        });
        swallowDispatchError(result, pushAssistant);
      };

      // Always clear stuck numbered-match traps (or consume a valid pick) first.
      const runAfterPending = () => {
        // Prefer typed catalogs / FAQ / context over host entity-open adapters.
        const preferCore = utteranceMatchesTypedCatalog(
          {
            queries: pack.queries,
            mutations: pack.mutations,
            tours: pack.tours,
            search: pack.search,
            faq: pack.faq,
          },
          trimmed
        );
        if (!preferCore && tryHandleUtterance) {
          const intercepted = tryHandleUtterance(trimmed);
          if (intercepted && typeof (intercepted as Promise<unknown>).then === 'function') {
            void (intercepted as Promise<boolean>).then((handled) => {
              if (handled) {
                conversationPipelineRef.current?.markLastUserOutcome('adapter');
              } else {
                runCore();
              }
            });
            return;
          }
          if (intercepted) {
            conversationPipelineRef.current?.markLastUserOutcome('adapter');
            return;
          }
        }
        runCore();
      };

      if (clearPendingChoices) {
        const picked = clearPendingChoices(trimmed);
        if (picked && typeof (picked as Promise<unknown>).then === 'function') {
          void (picked as Promise<boolean>).then((handled) => {
            if (handled) {
              conversationPipelineRef.current?.markLastUserOutcome('adapter');
            } else {
              runAfterPending();
            }
          });
          return;
        }
        if (picked) {
          conversationPipelineRef.current?.markLastUserOutcome('adapter');
          return;
        }
      }
      runAfterPending();
    },
    [
      draftCompilers,
      getContext,
      navigate,
      onApplyDraft,
      coachEventHandler,
      fallbackLlm,
      secondaryFallbackLlm,
      features,
      pack,
      parseUtteranceFn,
      clearPendingChoices,
      pushAssistant,
      tryHandleUtterance,
      resolveQuery,
      previewMutation,
      executeMutation,
      runTour,
      openSearchHit,
      resolveContextAsk,
    ]
  );

  const value = useMemo<NotLMContextValue>(
    () => ({
      pack,
      getContext,
      navigate,
      features,
      session,
      messages,
      statuses,
      panelOpen,
      paletteOpen,
      checklistOpen,
      spotlight,
      handleUserUtterance,
      pushAssistant,
      executeStep,
      notifyStepCompleted,
      setPanelOpen,
      setPaletteOpen,
      setChecklistOpen,
      clearSpotlight,
      chrome,
      hostRootStyle,
      hostRootClassName,
    }),
    [
      checklistOpen,
      chrome,
      clearSpotlight,
      executeStep,
      features,
      getContext,
      handleUserUtterance,
      pushAssistant,
      hostRootClassName,
      hostRootStyle,
      messages,
      navigate,
      notifyStepCompleted,
      pack,
      paletteOpen,
      panelOpen,
      session,
      spotlight,
      statuses,
    ]
  );

  return (
    <NotLMContext.Provider value={value}>{children}</NotLMContext.Provider>
  );
}

export function useNotLM(): NotLMContextValue {
  const ctx = useContext(NotLMContext);
  if (!ctx) {
    throw new Error('useNotLM must be used within NotLMProvider');
  }
  return ctx;
}

export { NotLMContext };
