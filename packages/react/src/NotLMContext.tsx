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
  listMissingRequires,
  markActiveStep,
  utteranceMatchesTypedCatalog,
  mintConversationId,
  createMemoryPhraseLru,
  type AssistantFeatures,
  type ChatChoice,
  type ChatMessage,
  type ConversationLogPipeline,
  type LoadedPack,
  type PackRuntime,
  type PhraseLruStore,
  type SessionSlots,
  type StepId,
  type ChatMessageLink,
} from '@notlm/core';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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
import { useSpotlightController } from './useSpotlightController.js';
import type { ChatThread } from './ThreadList.js';
import {
  DEFAULT_WELCOME,
  initialThreadState,
  loadPersistedThreads,
  newChatMessage,
  persistThreads,
} from './chatThreadState.js';
import type {
  ExecuteStepOpts,
  NotLMContextValue,
  NotLMProviderProps,
} from './notlmContextTypes.js';

export type {
  EnrichStatusesFn,
  ExecuteStepOpts,
  NotLMContextValue,
  NotLMProviderProps,
  OnWizardPageFn,
  OpenModalFn,
  OpenSurfaceFn,
} from './notlmContextTypes.js';

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

const NotLMContext = createContext<NotLMContextValue | null>(null);

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
      threads: true,
      ...featuresProp,
    }),
    [featuresProp]
  );

  const conversationIdRef = useRef(mintConversationId());
  const turnThreadIdRef = useRef<string | null>(null);
  const asyncFallbackOwnsPinRef = useRef(false);
  const fallbackGenRef = useRef(0);
  const conversationPipelineRef = useRef<ConversationLogPipeline | null>(null);
  const phraseLruRef = useRef<PhraseLruStore>(createMemoryPhraseLru());
  const executeStepRef = useRef<(stepId: StepId, opts?: ExecuteStepOpts) => void>(
    () => {}
  );
  const abortRef = useRef<AbortController | null>(null);
  const lastFallbackTextByThreadRef = useRef<Record<string, string>>({});
  const [fallbackBusy, setFallbackBusy] = useState(false);
  const [fallbackOwnsPin, setFallbackOwnsPin] = useState(false);
  const [composerQueueBustGen, setComposerQueueBustGen] = useState(0);

  const welcome = DEFAULT_WELCOME;
  const [activeThreadId, setActiveThreadId] = useState(() => {
    const persisted = loadPersistedThreads(pack.id);
    if (persisted?.activeThreadId) {
      conversationIdRef.current = persisted.activeThreadId;
      return persisted.activeThreadId;
    }
    return conversationIdRef.current;
  });
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    const persisted = loadPersistedThreads(pack.id);
    return persisted?.threads ?? initialThreadState(conversationIdRef.current).threads;
  });
  const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>(
    () => {
      const persisted = loadPersistedThreads(pack.id);
      return (
        persisted?.messagesByThread ??
        initialThreadState(conversationIdRef.current).messagesByThread
      );
    }
  );
  const messagesByThreadRef = useRef(messagesByThread);
  messagesByThreadRef.current = messagesByThread;
  const activeThreadIdRef = useRef(activeThreadId);
  activeThreadIdRef.current = activeThreadId;

  useEffect(() => {
    persistThreads(pack.id, {
      activeThreadId,
      threads,
      messagesByThread,
    });
  }, [pack.id, activeThreadId, threads, messagesByThread]);
  const messages = messagesByThread[activeThreadId] ?? [];

  const clearTurnThreadPin = useCallback(() => {
    turnThreadIdRef.current = null;
  }, []);

  const setMessagesForThread = useCallback(
    (threadId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessagesByThread((prev) => {
        const cur = prev[threadId] ?? [];
        return { ...prev, [threadId]: updater(cur) };
      });
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, updatedAt: Date.now() } : t
        )
      );
    },
    []
  );

  const setMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      const tid = turnThreadIdRef.current ?? conversationIdRef.current;
      setMessagesForThread(tid, updater);
    },
    [setMessagesForThread]
  );

  const [sessionByThread, setSessionByThread] = useState<Record<string, SessionSlots>>(
    () => {
      const persisted = loadPersistedThreads(pack.id);
      const tid = persisted?.activeThreadId ?? conversationIdRef.current;
      const initial: Record<string, SessionSlots> = { [tid]: emptySession() };
      const msgs = persisted?.messagesByThread;
      if (msgs) {
        for (const k of Object.keys(msgs)) {
          if (!initial[k]) initial[k] = emptySession();
        }
      }
      return initial;
    }
  );
  const session = sessionByThread[activeThreadId] ?? emptySession();
  const sessionRef = useRef(session);
  const sessionByThreadRef = useRef(sessionByThread);
  sessionByThreadRef.current = sessionByThread;
  const setSessionForThread = useCallback(
    (threadId: string, updater: (s: SessionSlots) => SessionSlots) => {
      setSessionByThread((prev) => {
        const cur = prev[threadId] ?? emptySession();
        const next = updater(cur);
        if (threadId === activeThreadIdRef.current) sessionRef.current = next;
        return { ...prev, [threadId]: next };
      });
    },
    []
  );

  const setSession = useCallback(
    (updater: (s: SessionSlots) => SessionSlots) => {
      const tid = turnThreadIdRef.current ?? conversationIdRef.current;
      setSessionForThread(tid, updater);
    },
    [setSessionForThread]
  );
  useEffect(() => {
    sessionRef.current = sessionByThread[activeThreadId] ?? emptySession();
  }, [activeThreadId, sessionByThread]);
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
          conversationId: activeThreadId,
          getConversationId: () =>
            turnThreadIdRef.current ?? conversationIdRef.current,
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
      openSurface: openSurface
        ? (key, step, surfaceOpts) =>
            openSurface(key, step ?? undefined, surfaceOpts)
        : undefined,
      getAbortSignal: () => {
        const hadInFlight = asyncFallbackOwnsPinRef.current;
        abortRef.current?.abort();
        // Bump gen; keep turn pin. Do not settle (pending is this turn).
        fallbackGenRef.current += 1;
        asyncFallbackOwnsPinRef.current = false;
        setFallbackOwnsPin(false);
        setFallbackBusy(false);
        // Internal preempt must bust composer queue (parity with cancelFallback).
        if (hadInFlight) setComposerQueueBustGen((n) => n + 1);
        abortRef.current = new AbortController();
        return abortRef.current.signal;
      },
      onBusyChange: (busy: boolean) => {
        if (busy) setFallbackBusy(true);
      },
      onFallbackMissText: (t) => {
        const tid = turnThreadIdRef.current ?? conversationIdRef.current;
        lastFallbackTextByThreadRef.current[tid] = t;
      },
      onAssistantReply: (t) => {
        conversationPipelineRef.current?.logChat('assistant', t);
      },
      onRepairResolved: (outcome) => {
        conversationPipelineRef.current?.markLastUserOutcome(outcome);
      },
      getTurnThreadId: () =>
        turnThreadIdRef.current ?? conversationIdRef.current,
      setMessagesForThread,
      setSessionForThread,
      getSession: () => {
        const tid = turnThreadIdRef.current ?? conversationIdRef.current;
        return sessionByThreadRef.current[tid] ?? emptySession();
      },
      getSessionForThread: (threadId: string) =>
        sessionByThreadRef.current[threadId] ?? emptySession(),
      onAsyncFallbackStarted: () => {
        const gen = ++fallbackGenRef.current;
        asyncFallbackOwnsPinRef.current = true;
        setFallbackOwnsPin(true);
        return gen;
      },
      onEscalatedToLaya: () => {
        conversationPipelineRef.current?.settleRepairMiss();
      },
      onAsyncFallbackFinished: (generation?: number) => {
        if (
          typeof generation !== 'number' ||
          generation !== fallbackGenRef.current
        ) {
          return;
        }
        asyncFallbackOwnsPinRef.current = false;
        setFallbackOwnsPin(false);
        setFallbackBusy(false);
        clearTurnThreadPin();
      },
      getRecentTurns: () => {
        const tid = turnThreadIdRef.current ?? conversationIdRef.current;
        const msgs = messagesByThreadRef.current[tid] ?? [];
        return msgs
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .filter((m) => m.status !== 'thinking')
          .slice(-8)
          .map((m) => ({ role: m.role, text: m.text }));
      },
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
    setMessages,
    setMessagesForThread,
    setSession,
    setSessionForThread,
    clearTurnThreadPin,
    activeThreadId,
    openSurface,
  ]);

  const cancelFallback = useCallback((opts?: { skipSettleRepair?: boolean }) => {
    abortRef.current?.abort();
    abortRef.current = null;
    fallbackGenRef.current += 1;
    setFallbackBusy(false);
    setFallbackOwnsPin(false);
    setComposerQueueBustGen((n) => n + 1);
    if (!opts?.skipSettleRepair) {
      conversationPipelineRef.current?.settleRepairMiss();
    }
    const tid = turnThreadIdRef.current ?? conversationIdRef.current;
    setMessagesForThread(tid, (prev) =>
      prev.filter((m) => m.status !== 'thinking' && m.status !== 'streaming')
    );
    asyncFallbackOwnsPinRef.current = false;
    clearTurnThreadPin();
  }, [clearTurnThreadPin, setMessagesForThread]);

  const selectThread = useCallback(
    (id: string) => {
      cancelFallback();
      conversationIdRef.current = id;
      setActiveThreadId(id);
    },
    [cancelFallback]
  );

  const newThread = useCallback(() => {
    cancelFallback();
    const id = mintConversationId();
    conversationIdRef.current = id;
    setActiveThreadId(id);
    setThreads((prev) => [{ id, title: 'Chat', updatedAt: Date.now() }, ...prev]);
    setMessagesByThread((prev) => ({
      ...prev,
      [id]: [newChatMessage('assistant', welcome)],
    }));
    setSessionByThread((prev) => ({ ...prev, [id]: emptySession() }));
  }, [cancelFallback, welcome]);

  const handleUserUtteranceRef = useRef<
    (text: string, opts?: { skipUserAppend?: boolean }) => void
  >(() => {});

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
        newChatMessage('assistant', text, opts?.choices, {
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
      setSession((prev) => markActiveStep(prev, stepId));

      const mergedPrefill = { ...(nav.prefill ?? {}), ...(opts?.prefill ?? {}) };
      // Persist draft before CTA for host controlled inputs.
      if (nav.draftKey && Object.keys(mergedPrefill).length > 0) {
        writeDraft(pack.id, nav.draftKey, mergedPrefill);
      }

      runBeforeOpen(nav);
      if (nav.path) navigate(nav.path, nav.search ? { search: nav.search } : undefined);
      const modalKey =
        opts?.forceOpenModal ||
        (!opts?.skipOpenModal ? nav.openModal : undefined);
      if (modalKey) openModal?.(modalKey);
      const surfaceKey = opts?.forceOpenSurface || nav.openSurface;
      const surfaceStep =
        opts?.forceSurfaceStep !== undefined
          ? opts.forceSurfaceStep ?? undefined
          : nav.surfaceStep ??
            (typeof surfaceKey === 'string' && /^confirmDelete/.test(surfaceKey)
              ? undefined
              : stepId);
      if (surfaceKey) {
        openSurface?.(surfaceKey, surfaceStep);
      }
      if (nav.wizardId != null && nav.wizardPage != null) {
        onWizardPage?.(nav.wizardId, nav.wizardPage);
      }
      if (nav.confirmDialog && !opts?.forceOpenSurface) {
        queueMicrotask(() => {
          requestAnimationFrame(() => {
            flashGuideField(nav.confirmDialog!);
            clickGuide(nav.confirmDialog!);
          });
        });
      }
      const coachCreate = Boolean(
        opts?.coachCreate ||
          (!opts?.skipOpenModal && (nav.coachCreate || nav.openModal))
      );
      const spotlightOnly = isSpotlightOnly(nav);
      const skipCoach =
        Boolean(opts?.skipCoach) ||
        coachCreate ||
        Boolean(modalKey) ||
        Boolean(surfaceKey);
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
        // Re-open nudge when form has no userFill; skip if caller already coached.
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
      setSession(() => result.session);
      for (let i = 0; i < result.messages.length; i++) {
        const msg = result.messages[i]!;
        const choices =
          i === result.messages.length - 1 ? result.choices : undefined;
        pushAssistant(msg, choices?.length ? { choices } : undefined);
      }
      if (result.executeNext) {
        const next = result.executeNext;
        const assumeComplete = [stepId];
        // Next control often mounts on the following frame.
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
    (text: string, opts?: { skipUserAppend?: boolean }) => {
      const trimmed = text.trim();
      if (fallbackBusy || asyncFallbackOwnsPinRef.current) cancelFallback();
      turnThreadIdRef.current = conversationIdRef.current;
      if (!opts?.skipUserAppend) {
        conversationPipelineRef.current?.logChat('user', trimmed || text);
        setMessages((prev) => [
          ...prev,
          newChatMessage('user', trimmed || text || ' '),
        ]);
      }
      setPanelOpen(true);
      if (!trimmed) {
        // Core also handles empty, but never drop the turn before dispatch.
        pushAssistant('Say a product question, a checklist step, or what’s next.');
        return;
      }

      const runCore = () => {
        const turnId = turnThreadIdRef.current ?? conversationIdRef.current;
        const turnSession = sessionByThreadRef.current[turnId] ?? emptySession();
        const finishTurn = () => {
          if (!asyncFallbackOwnsPinRef.current) clearTurnThreadPin();
        };
        const decisionFallbackOn =
          Boolean(fallbackLlm) && isDecisionFallbackEnabled(features);
        const result = dispatchUserUtterance({
          text: trimmed,
          pack: asLoadedPack(pack),
          session: turnSession,
          ctx: getContext(),
          features,
          pushAssistant,
          executeStep: executeStepRef.current,
          setSession,
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
          // Mid/low step confidence → Laya (then secondary LLM), not Yes/No chips.
          deferLowConfidenceToFallback: decisionFallbackOn,
          resolveQuery,
          previewMutation,
          executeMutation,
          runTour,
          openSearchHit,
          resolveContextAsk,
          openSurface: openSurface
            ? (key, step, surfaceOpts) =>
                openSurface(key, step ?? undefined, surfaceOpts)
            : undefined,
        });
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          void (result as Promise<void>)
            .catch(() => {
              pushAssistant(
                'Something went wrong parsing that — try again in a moment.'
              );
            })
            .finally(finishTurn);
        } else {
          finishTurn();
        }
      };

      const runAfterPending = () => {
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
                clearTurnThreadPin();
              } else {
                runCore();
              }
            });
            return;
          }
          if (intercepted) {
            conversationPipelineRef.current?.markLastUserOutcome('adapter');
            clearTurnThreadPin();
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
              clearTurnThreadPin();
            } else {
              runAfterPending();
            }
          });
          return;
        }
        if (picked) {
          conversationPipelineRef.current?.markLastUserOutcome('adapter');
          clearTurnThreadPin();
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
      setMessages,
      clearTurnThreadPin,
      openSurface,
      fallbackBusy,
      cancelFallback,
    ]
  );

  handleUserUtteranceRef.current = handleUserUtterance;

  const regenerateLastFallback = useCallback(() => {
    // Same thread key as onFallbackMissText (turn pin, else active).
    const tid = turnThreadIdRef.current ?? conversationIdRef.current;
    const text = lastFallbackTextByThreadRef.current[tid]?.trim();
    if (!text) return;
    cancelFallback({ skipSettleRepair: true });
    conversationPipelineRef.current?.noteRegenerateReplay();
    handleUserUtteranceRef.current(text, { skipUserAppend: true });
  }, [cancelFallback]);

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
      fallbackBusy,
      fallbackInFlight: fallbackBusy || fallbackOwnsPin,
      composerQueueBustGen,
      cancelFallback,
      regenerateLastFallback,
      threads,
      activeThreadId,
      selectThread,
      newThread,
    }),
    [
      activeThreadId,
      cancelFallback,
      checklistOpen,
      chrome,
      clearSpotlight,
      composerQueueBustGen,
      executeStep,
      fallbackBusy,
      fallbackOwnsPin,
      features,
      getContext,
      handleUserUtterance,
      pushAssistant,
      hostRootClassName,
      hostRootStyle,
      messages,
      navigate,
      newThread,
      notifyStepCompleted,
      pack,
      paletteOpen,
      panelOpen,
      regenerateLastFallback,
      selectThread,
      session,
      spotlight,
      statuses,
      threads,
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
