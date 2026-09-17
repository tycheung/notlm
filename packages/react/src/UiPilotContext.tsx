import {
  advanceAfterStepCompleted,
  composeCoachEventHandlers,
  createMissLogPipeline,
  dispatchUserUtterance,
  emptySession,
  evaluateFlowStatuses,
  formatBlockedQueueMessage,
  invokeLlmFallback,
  isLearningModeEnabled,
  isMissKind,
  listMissingRequires,
  markActiveStep,
  type AssistantFeatures,
  type ChatChoice,
  type ChatMessage,
  type CoachEvent,
  type LlmFallbackFn,
  type LoadedPack,
  type MissExchangeTransport,
  type MissKind,
  type MissLogTransport,
  type PackRuntime,
  type ParseUtteranceFn,
  type RuntimeContextBase,
  type SessionSlots,
  type SlotBag,
  type StepId,
  type StepStatus,
  type DraftCompiler,
  type ChatMessageLink,
} from '@uipilot/core';
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
import type { UiPilotChromeConfig } from './chromeTypes.js';
import { DEFAULT_GUIDE_ATTR, flashGuideField, flashGuideFieldsSequential } from './fieldFlash.js';
import { applyPrefill } from './fieldPrefill.js';
import { clickGuide } from './clickGuide.js';
import { writeDraft } from './draftBridge.js';
import {
  coachCopyForRole,
  isSpotlightOnly,
  runBeforeOpen,
} from './guideInteract.js';
import { appearanceToCssVars } from './uipilot.css.js';
import { useSpotlightController, type SpotlightState } from './useSpotlightController.js';

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

export type UiPilotContextValue = {
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
  chrome: UiPilotChromeConfig;
  hostRootStyle: CSSProperties;
  hostRootClassName: string;
};

const UiPilotContext = createContext<UiPilotContextValue | null>(null);

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

export type UiPilotProviderProps = {
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
   * Host BYO backup LLM (server proxy). Only used when `features.learningMode` is true
   * (default off — offline NLU with canned repair).
   */
  fallbackLlm?: LlmFallbackFn;
  children: ReactNode;
} & UiPilotChromeConfig;

export function UiPilotProvider({
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
  tryHandleUtterance,
  onCoachEvent,
  missLog,
  fallbackLlm,
  appearance,
  className,
  classNames,
  components,
  labels,
  style,
  children,
}: UiPilotProviderProps) {
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

  const pushAssistantRef = useRef<
    (
      text: string,
      opts?: { choices?: ChatChoice[]; links?: ChatMessageLink[]; intentKey?: string }
    ) => void
  >(() => {});

  const coachEventHandler = useMemo(() => {
    const missEnabled = Boolean(missLog?.transport) && features.missLog !== false;
    const pipeline = missEnabled
      ? createMissLogPipeline({
          transport: missLog!.transport,
          kinds: missLog!.kinds,
          packId: missLog!.packId ?? pack.id,
          getPathname:
            missLog!.getPathname ??
            (() => {
              try {
                return getContext().pathname;
              } catch {
                return undefined;
              }
            }),
        })
      : null;

    const fallbackEnabled =
      Boolean(fallbackLlm) && isLearningModeEnabled(features);

    const knownStepIds = new Set(pack.steps.map((s) => s.id));

    const onFallbackMiss = (event: CoachEvent) => {
      if (!fallbackEnabled || !fallbackLlm) return;
      if (event.type !== 'repair' || !isMissKind(event.kind)) return;
      const missKind = event.kind;
      const text = (event.text ?? '').trim();
      if (!text) return;
      void (async () => {
        let pathname: string | undefined;
        try {
          pathname =
            missLog?.getPathname?.() ?? getContext().pathname;
        } catch {
          pathname = undefined;
        }
        const result = await invokeLlmFallback(
          fallbackLlm,
          {
            text,
            kind: missKind,
            packId: missLog?.packId ?? pack.id,
            pathname,
          },
          { knownStepIds }
        );
        if (!result) return;
        const choices =
          result.proposed?.type === 'goto' && result.proposed.stepId
            ? [{ id: result.proposed.stepId, label: result.proposed.stepId }]
            : undefined;
        pushAssistantRef.current(result.reply, choices ? { choices } : undefined);
        const exchangeTransport = missLog?.exchangeTransport;
        if (exchangeTransport) {
          void Promise.resolve(
            exchangeTransport.logExchange({
              text,
              kind: missKind,
              packId: missLog?.packId ?? pack.id,
              pathname,
              rawIntent: event.rawIntent,
              confidence: event.confidence,
              at: new Date().toISOString(),
              llmReply: result.reply,
              proposed: result.proposed,
              provider: result.provider,
              exchangeId: result.exchangeId,
            })
          ).catch(() => {
            /* host failures must not break chat */
          });
        }
      })();
    };

    return composeCoachEventHandlers(
      pipeline?.onCoachEvent,
      onFallbackMiss,
      onCoachEvent
    );
  }, [
    fallbackLlm,
    features,
    getContext,
    missLog,
    onCoachEvent,
    pack.id,
    pack.steps,
  ]);

  const chrome = useMemo<UiPilotChromeConfig>(
    () => ({ appearance, className, classNames, components, labels, style }),
    [appearance, className, classNames, components, labels, style]
  );

  const hostRootStyle = useMemo<CSSProperties>(
    () => ({ ...appearanceToCssVars(appearance), ...style }),
    [appearance, style]
  );

  const hostRootClassName = ['uipilot-host-root', className, classNames?.root]
    .filter(Boolean)
    .join(' ');

  const [session, setSession] = useState<SessionSlots>(() => emptySession());
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    newMessage('assistant', 'How can I help? Ask for a workflow step or open the command palette.'),
  ]);
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
  pushAssistantRef.current = pushAssistant;

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
      } else if (coachCreate && nav.openModal) {
        // Re-open path: brief coach nudge when form has no userFill list.
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

  const executeStepRef = useRef(executeStep);
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
      setMessages((prev) => [...prev, newMessage('user', trimmed)]);
      setPanelOpen(true);

      const runCore = () => {
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
          draftCompilers,
          onApplyDraft,
          onCoachEvent: coachEventHandler,
        });
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          void (result as Promise<void>).catch(() => {
            pushAssistant('Something went wrong parsing that — try again in a moment.');
          });
        }
      };

      if (tryHandleUtterance) {
        const intercepted = tryHandleUtterance(trimmed);
        if (intercepted && typeof (intercepted as Promise<unknown>).then === 'function') {
          void (intercepted as Promise<boolean>).then((handled) => {
            if (!handled) runCore();
          });
          return;
        }
        if (intercepted) return;
      }
      runCore();
    },
    [
      draftCompilers,
      getContext,
      navigate,
      onApplyDraft,
      coachEventHandler,
      pack,
      parseUtteranceFn,
      pushAssistant,
      tryHandleUtterance,
    ]
  );

  const value = useMemo<UiPilotContextValue>(
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
    <UiPilotContext.Provider value={value}>{children}</UiPilotContext.Provider>
  );
}

export function useUiPilot(): UiPilotContextValue {
  const ctx = useContext(UiPilotContext);
  if (!ctx) {
    throw new Error('useUiPilot must be used within UiPilotProvider');
  }
  return ctx;
}

export { UiPilotContext };
