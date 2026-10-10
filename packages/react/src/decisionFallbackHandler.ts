import type {
  AssistantFeatures,
  ChatChoice,
  ChatMessage,
  ChatMessageLink,
  CoachEvent,
  ExecuteMutationFn,
  LlmFallbackFn,
  LoadedPack,
  MissExchangeTransport,
  OpenSearchHitFn,
  PreviewMutationFn,
  ResolveQueryFn,
  RunTourFn,
  SessionSlots,
  StepId,
} from '@notlm/core';
import {
  defaultOodRefuseReply,
  FALLBACK_UNAVAILABLE_REPLY,
  invokeChainedDecisionFallback,
  isAutoExecuteTrustedGotoEnabled,
  isAutoExecutableTrustedGoto,
  isDecisionFallbackEnabled,
  isDecisionFallbackMissKind,
  isSecondaryLlmFallbackEnabled,
  isSemanticRetrieveEnabled,
  isTrustedGoto,
  looksLikeClearOod,
  looksLikeNavCommand,
  mismatchedGotoClarifyReply,
  retrieveSemantic,
  sanitizeFallbackReply,
  semanticFaqIdHints,
  shouldSurfaceTrustedGoto,
  stepChoices,
  stepTitle,
  tryDispatchCapabilityCatalog,
} from '@notlm/core';
import { logExchangeSafe } from './hostTelemetry.js';

type NavigateFn = (path: string, opts?: { search?: string }) => void;

export type DecisionFallbackDeps = {
  pack: LoadedPack;
  features: AssistantFeatures;
  fallbackLlm?: LlmFallbackFn;
  secondaryFallbackLlm?: LlmFallbackFn;
  missLog?: {
    packId?: string;
    getPathname?: () => string | undefined;
    exchangeTransport?: MissExchangeTransport;
  };
  conversationLog?: {
    packId?: string;
    getPathname?: () => string | undefined;
  };
  getContext: () => { pathname: string; data: Record<string, unknown> };
  thinkingLabel: string;
  setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  /** Pin assistant UI to the thread that started this fallback (survives pin clear / thread switch). */
  setMessagesForThread?: (
    threadId: string,
    updater: (prev: ChatMessage[]) => ChatMessage[]
  ) => void;
  setSession: (updater: (prev: SessionSlots) => SessionSlots) => void;
  setSessionForThread?: (
    threadId: string,
    updater: (prev: SessionSlots) => SessionSlots
  ) => void;
  sessionRef: { current: SessionSlots };
  getSession?: () => SessionSlots;
  getSessionForThread?: (threadId: string) => SessionSlots;
  getTurnThreadId?: () => string;
  /**
   * Sync: async Laya/LLM path started — host should defer clearing the turn thread pin.
   * Return a generation id so only the latest run clears pin/busy on finish.
   */
  onAsyncFallbackStarted?: () => number | void;
  /** Async fallback finished (success, error, or abort). Pass the start generation. */
  onAsyncFallbackFinished?: (generation?: number) => void;
  executeStepRef: {
    current: (stepId: StepId, opts?: { skipCoach?: boolean }) => void;
  };
  navigate: NavigateFn;
  resolveQuery?: ResolveQueryFn;
  previewMutation?: PreviewMutationFn;
  executeMutation?: ExecuteMutationFn;
  runTour?: RunTourFn;
  openSearchHit?: OpenSearchHitFn;
  openSurface?: (
    surfaceKey: string,
    surfaceStep?: string,
    opts?: { deleteList?: 'sa' | 'full' }
  ) => void;
  getAbortSignal?: () => AbortSignal | undefined;
  onBusyChange?: (busy: boolean) => void;
  onFallbackMissText?: (text: string) => void;
  /** Host conversation telemetry for assistant turns that bypass pushAssistant. */
  onAssistantReply?: (text: string) => void;
  /**
   * Upgrade the repair miss outcome when semantic FAQ/query resolves without Laya.
   */
  onRepairResolved?: (outcome: 'hit') => void;
  /** Laya/LLM UI started — settle deferred repair as miss (NLU miss stands). */
  onEscalatedToLaya?: () => void;
  /** Last N chat turns for follow-up context (role:text). */
  getRecentTurns?: () => Array<{ role: string; text: string }>;
};

export function createDecisionFallbackHandler(
  deps: DecisionFallbackDeps
): (event: CoachEvent) => void {
  const fallbackEnabled =
    Boolean(deps.fallbackLlm) && isDecisionFallbackEnabled(deps.features);
  const secondaryEnabled =
    Boolean(deps.secondaryFallbackLlm) &&
    isSecondaryLlmFallbackEnabled(deps.features);
  // Low/mid NLU confidence should reach Laya whenever decision fallback is on
  // (not only when a secondary LLM is configured).
  const includeLowConfidenceFallback = fallbackEnabled;

  const knownStepIds = new Set(deps.pack.steps.map((s) => s.id));
  const stepIdList = deps.pack.steps.map((s) => s.id).slice(0, 50);
  const faqIdList = (deps.pack.faq ?? []).map((f) => f.id).slice(0, 50);
  const queryIdList = (deps.pack.queries ?? []).map((q) => q.id).slice(0, 50);
  const mutationIdList = (deps.pack.mutations ?? []).map((m) => m.id).slice(0, 50);
  const tourIdList = (deps.pack.tours ?? []).map((t) => t.id).slice(0, 50);
  const searchIdList = (deps.pack.search ?? []).map((s) => s.id).slice(0, 50);
  const knownQueryIds = new Set(queryIdList);
  const knownMutationIds = new Set(mutationIdList);
  const knownTourIds = new Set(tourIdList);
  const knownSearchIds = new Set(searchIdList);
  const stepCatalogDigest = deps.pack.steps
    .slice(0, 50)
    .map((s) => `${s.id}:${s.title}`)
    .join('|')
    .slice(0, 1800);
  const autoNav = isAutoExecuteTrustedGotoEnabled(deps.features);

  return (event: CoachEvent) => {
    if (!fallbackEnabled || !deps.fallbackLlm) return;
    if (event.type !== 'repair') return;
    // Clear-OOD already pushed a canned reply in dispatch — miss-log only, no Laya.
    if (event.rawIntent === 'ood') return;
    if (
      !isDecisionFallbackMissKind(event.kind, {
        includeLowConfidence: includeLowConfidenceFallback,
      })
    ) {
      return;
    }
    const missKind = event.kind;
    const text = (event.text ?? '').trim();
    if (!text) return;
    deps.onFallbackMissText?.(text);

    const boundThreadId = deps.getTurnThreadId?.() ?? '';
    const patchMessages = (
      updater: (prev: ChatMessage[]) => ChatMessage[]
    ): void => {
      if (boundThreadId && deps.setMessagesForThread) {
        deps.setMessagesForThread(boundThreadId, updater);
      } else {
        deps.setMessages(updater);
      }
    };
    const patchSession = (updater: (prev: SessionSlots) => SessionSlots): void => {
      if (boundThreadId && deps.setSessionForThread) {
        deps.setSessionForThread(boundThreadId, updater);
      } else {
        deps.setSession(updater);
      }
    };
    const sessionForCap = (): SessionSlots =>
      (boundThreadId && deps.getSessionForThread
        ? deps.getSessionForThread(boundThreadId)
        : deps.getSession?.()) ?? deps.sessionRef.current;

    let fallbackGen: number | undefined;

    // System One semantic retrieve: high-bar accept before Laya; else constrain faqIds.
    // Skip nav-shaped utterances (parity with dispatch.ts).
    const semLayers =
      deps.pack.semanticIndexLayers ??
      (deps.pack.semanticIndex ? [deps.pack.semanticIndex] : []);
    const semEnabled =
      isSemanticRetrieveEnabled(deps.features) &&
      semLayers.length > 0 &&
      !looksLikeNavCommand(text, deps.pack.compiledHeuristics);
    const sem = semEnabled
      ? retrieveSemantic(text, semLayers, {
          heuristics: deps.pack.compiledHeuristics,
        })
      : null;
    let emptyFaqAcceptedId: string | null = null;
    if (sem?.accepted?.kind === 'faq') {
      const entry = (deps.pack.faq ?? []).find((f) => f.id === sem.accepted!.id);
      if (entry?.text?.trim()) {
        deps.getAbortSignal?.(); // preempt prior Laya/repair
        deps.onRepairResolved?.('hit');
        deps.onAssistantReply?.(entry.text);
        patchMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant' as const,
            text: entry.text,
            at: Date.now(),
            status: 'final' as const,
            intentKey: entry.id,
            choices: entry.stepId
              ? stepChoices(deps.pack, [entry.stepId])
              : undefined,
          },
        ]);
        return;
      }
      // Accepted FAQ id with empty/missing text is not a hit — exclude from Laya hints.
      emptyFaqAcceptedId = sem.accepted.id;
    }
    // Pending async query resolve — await inside thinking block; never fire-and-forget
    // (failed resolve must fall through to fuzzy then Laya).
    let pendingQueryCap: Promise<boolean> | null = null;
    let semanticQueryCapDeps: Parameters<
      typeof tryDispatchCapabilityCatalog
    >[0] | null = null;
    if (sem?.accepted?.kind === 'query') {
      const pushAssistant = (
        reply: string,
        opts?: { choices?: ChatChoice[]; links?: ChatMessageLink[] }
      ) => {
        deps.onAssistantReply?.(reply);
        patchMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant' as const,
            text: reply,
            at: Date.now(),
            choices: opts?.choices,
            links: opts?.links,
            status: 'final' as const,
            intentKey: sem.accepted!.id,
          },
        ]);
      };
      const capDeps = {
        text,
        pack: deps.pack,
        session: sessionForCap(),
        ctx: deps.getContext(),
        pushAssistant,
        executeStep: deps.executeStepRef.current,
        setSession: patchSession,
        navigate: (path: string) => deps.navigate(path),
        resolveQuery: deps.resolveQuery,
        previewMutation: deps.previewMutation,
        executeMutation: deps.executeMutation,
        runTour: deps.runTour,
        openSearchHit: deps.openSearchHit,
        openSurface: deps.openSurface,
      };
      // Always keep deps for fuzzy retry (even when resolveQuery is unwired).
      semanticQueryCapDeps = capDeps;
      if (deps.resolveQuery) {
        const cap = tryDispatchCapabilityCatalog(capDeps, text, {
          queryId: sem.accepted.id,
          trustedQueryId: true,
        });
        if (cap === true) {
          deps.getAbortSignal?.(); // preempt prior Laya/repair
          deps.onRepairResolved?.('hit');
          return;
        }
        if (cap && typeof (cap as Promise<unknown>).then === 'function') {
          pendingQueryCap = cap as Promise<boolean>;
        }
      }
    }
    const constrainedFaqIds = (sem ? semanticFaqIdHints(sem, 8) : []).filter(
      (id) => id !== emptyFaqAcceptedId
    );

    // Abort after sync semantic short-circuits so early returns cannot clear pin
    // without claiming. Sync hits still preempt via getAbortSignal before return.
    const signal = deps.getAbortSignal?.();

    const thinkingId = `thinking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Defer busy/Thinking… until Laya starts. Claim pin gen synchronously before
    // scheduling async work so finishTurn cannot clear the turn pin.
    let thinkingShown = false;
    let raisedBusy = false;
    const claimPinGen = (): void => {
      if (typeof fallbackGen === 'number') return;
      fallbackGen = deps.onAsyncFallbackStarted?.() ?? undefined;
    };
    if (!signal?.aborted) {
      claimPinGen();
    }
    const stripThinking = (): void => {
      if (!thinkingShown) return;
      patchMessages((prev) => prev.filter((m) => m.id !== thinkingId));
      thinkingShown = false;
    };
    const beginThinkingUi = (): void => {
      if (thinkingShown) return;
      thinkingShown = true;
      claimPinGen();
      deps.onEscalatedToLaya?.();
      if (!raisedBusy) {
        raisedBusy = true;
        deps.onBusyChange?.(true);
      }
      patchMessages((prev) => [
        ...prev,
        {
          id: thinkingId,
          role: 'assistant' as const,
          text: deps.thinkingLabel,
          at: Date.now(),
          status: 'thinking' as const,
        },
      ]);
    };
    const finishCapSuccessUi = (): void => {
      deps.onRepairResolved?.('hit');
      // Side-effect-only success → Done. even when Thinking… never showed.
      let emittedAck = false;
      patchMessages((prev) => {
        const without = thinkingShown
          ? prev.filter((m) => m.id !== thinkingId)
          : prev;
        const last = without[without.length - 1];
        const hasVisible =
          last?.role === 'assistant' &&
          (String(last.text ?? '').trim().length > 0 ||
            (last.choices?.length ?? 0) > 0 ||
            (last.links?.length ?? 0) > 0);
        if (hasVisible) return without;
        emittedAck = true;
        const base =
          last?.role === 'assistant' ? without.slice(0, -1) : without;
        return [
          ...base,
          {
            id: `a-${Date.now()}`,
            role: 'assistant' as const,
            text: 'Done.',
            at: Date.now(),
            status: 'final' as const,
          },
        ];
      });
      if (emittedAck) deps.onAssistantReply?.('Done.');
      thinkingShown = false;
    };
    const aborted = (): boolean => {
      if (!signal?.aborted) return false;
      stripThinking();
      return true;
    };
    void (async () => {
      try {
      if (aborted()) return;
      // Own the turn pin before any await (sync prelude runs before finishTurn).
      claimPinGen();
      if (pendingQueryCap) {
        try {
          const handled = await pendingQueryCap;
          if (aborted()) return;
          if (handled) {
            finishCapSuccessUi();
            return;
          }
        } catch {
          /* fall through — fuzzy then Laya */
        }
      }
      if (aborted()) return;
      // Sync or async forced-query miss: one fuzzy catalog attempt before Laya.
      if (semanticQueryCapDeps) {
        try {
          const fuzzy = tryDispatchCapabilityCatalog(semanticQueryCapDeps, text);
          const fuzzyHandled =
            fuzzy && typeof (fuzzy as Promise<unknown>).then === 'function'
              ? await (fuzzy as Promise<boolean>)
              : fuzzy === true;
          if (aborted()) return;
          if (fuzzyHandled) {
            finishCapSuccessUi();
            return;
          }
        } catch {
          /* fall through to Laya */
        }
      }
      if (aborted()) return;
      beginThinkingUi();
      let pathname: string | undefined;
      let ctxData: Record<string, unknown> = {};
      try {
        const ctx = deps.getContext();
        pathname =
          deps.missLog?.getPathname?.() ??
          deps.conversationLog?.getPathname?.() ??
          ctx.pathname;
        ctxData = (ctx.data ?? {}) as Record<string, unknown>;
      } catch {
        pathname = undefined;
      }
      const pageBits = [
        pathname ? `path=${pathname}` : '',
        ctxData.eventName ? `event=${String(ctxData.eventName)}` : '',
        ctxData.tournamentName
          ? `tournament=${String(ctxData.tournamentName)}`
          : '',
        ctxData.tab ? `tab=${String(ctxData.tab)}` : '',
        ctxData.approvedParticipantCount != null
          ? `roster=${String(ctxData.approvedParticipantCount)}`
          : '',
        ctxData.saOnlyMode === true ? 'saOnly=1' : '',
      ]
        .filter(Boolean)
        .join(',');
      const recentTurns = (deps.getRecentTurns?.() ?? [])
        .slice(-6)
        .map((t) => `${t.role}:${t.text.slice(0, 120)}`)
        .join('|');
      const contextDigest = [pageBits, recentTurns ? `hist=${recentTurns}` : '', stepCatalogDigest]
        .filter(Boolean)
        .join(';')
        .slice(0, 2000);
      const result = await invokeChainedDecisionFallback({
        primary: deps.fallbackLlm!,
        secondary: deps.secondaryFallbackLlm,
        secondaryEnabled,
        request: {
          text,
          kind: missKind,
          packId: deps.missLog?.packId ?? deps.conversationLog?.packId ?? deps.pack.id,
          pathname,
          contextDigest: contextDigest || undefined,
          stepIds: stepIdList,
          faqIds: (() => {
            const ids = constrainedFaqIds.length ? constrainedFaqIds : faqIdList;
            return ids.length ? ids : undefined;
          })(),
          queryIds: queryIdList.length ? queryIdList : undefined,
          mutationIds: mutationIdList.length ? mutationIdList : undefined,
          tourIds: tourIdList.length ? tourIdList : undefined,
          searchIds: searchIdList.length ? searchIdList : undefined,
        },
        opts: {
          knownStepIds,
          knownQueryIds,
          knownMutationIds,
          knownTourIds,
          knownSearchIds,
          signal,
          onDelta: (partial) => {
            if (signal?.aborted) return;
            patchMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? { ...m, text: partial, status: 'streaming' as const }
                  : m
              )
            );
          },
        },
      });
      if (aborted()) return;
      const resolveFaqPackText = (): string | null => {
        const faqId = result?.proposed?.faqId?.trim();
        if (!faqId || result?.proposed?.type !== 'faq') return null;
        const entry = (deps.pack.faq ?? []).find((f) => f.id === faqId);
        const body = entry?.text?.trim();
        return body || null;
      };
      const replaceThinking = (reply: string, choices?: ChatChoice[]) => {
        if (signal?.aborted) {
          stripThinking();
          return;
        }
        const cleaned =
          sanitizeFallbackReply(reply, text) ??
          resolveFaqPackText() ??
          FALLBACK_UNAVAILABLE_REPLY;
        deps.onAssistantReply?.(cleaned);
        patchMessages((prev) => {
          const without = prev.filter((m) => m.id !== thinkingId);
          return [
            ...without,
            {
              id: `a-${Date.now()}`,
              role: 'assistant' as const,
              text: cleaned,
              at: Date.now(),
              choices,
              status: 'final' as const,
            },
          ];
        });
        thinkingShown = false;
      };
      if (!result) {
        // Never silently drop — always leave a visible outcome.
        replaceThinking(FALLBACK_UNAVAILABLE_REPLY);
        return;
      }
      const proposed = result.proposed;
      if (
        proposed &&
        (proposed.type === 'query' ||
          proposed.type === 'mutation' ||
          proposed.type === 'tour' ||
          proposed.type === 'search')
      ) {
        const capDeps = {
          text,
          pack: deps.pack,
          session: sessionForCap(),
          ctx: deps.getContext(),
          pushAssistant: (
            reply: string,
            opts?: { choices?: ChatChoice[]; links?: ChatMessageLink[] }
          ) => {
            if (signal?.aborted) return;
            deps.onAssistantReply?.(reply);
            patchMessages((prev) => {
              const without = prev.filter((m) => m.id !== thinkingId);
              return [
                ...without,
                {
                  id: `a-${Date.now()}`,
                  role: 'assistant' as const,
                  text: reply,
                  at: Date.now(),
                  choices: opts?.choices,
                  links: opts?.links,
                  status: 'final' as const,
                },
              ];
            });
          },
          executeStep: (stepId: StepId, opts?: { skipCoach?: boolean }) => {
            if (signal?.aborted) return;
            deps.executeStepRef.current(stepId, opts);
          },
          setSession: (updater: (prev: SessionSlots) => SessionSlots) => {
            if (signal?.aborted) return;
            patchSession(updater);
          },
          navigate: (path: string) => {
            if (signal?.aborted) return;
            deps.navigate(path);
          },
          resolveQuery: deps.resolveQuery,
          previewMutation: deps.previewMutation,
          executeMutation: deps.executeMutation,
          runTour: deps.runTour,
          openSearchHit: deps.openSearchHit,
          openSurface: deps.openSurface
            ? (
                key: string,
                step?: string,
                surfaceOpts?: { deleteList?: 'sa' | 'full' }
              ) => {
                if (signal?.aborted) return;
                deps.openSurface?.(key, step, surfaceOpts);
              }
            : undefined,
        };
        const cap = tryDispatchCapabilityCatalog(capDeps, text, {
          queryId: proposed.queryId,
          mutationId: proposed.mutationId,
          tourId: proposed.tourId,
          searchId: proposed.searchId,
        });
        let handled = false;
        try {
          handled =
            cap && typeof (cap as Promise<unknown>).then === 'function'
              ? await (cap as Promise<boolean>)
              : cap === true;
        } catch {
          handled = false;
        }
        if (aborted()) return;
        const ensureVisibleAfterCap = () => {
          if (signal?.aborted) {
            stripThinking();
            return;
          }
          // Capability claimed handled — never strip Thinking… into a blank turn.
          // Side-effect-only success → Done. (parity with finishCapSuccessUi).
          let emittedAck = false;
          patchMessages((prev) => {
            const without = prev.filter((m) => m.id !== thinkingId);
            const last = without[without.length - 1];
            const hasVisible =
              last?.role === 'assistant' &&
              (String(last.text ?? '').trim().length > 0 ||
                (last.choices?.length ?? 0) > 0 ||
                (last.links?.length ?? 0) > 0);
            if (hasVisible) return without;
            emittedAck = true;
            const base =
              last?.role === 'assistant' ? without.slice(0, -1) : without;
            return [
              ...base,
              {
                id: `a-${Date.now()}`,
                role: 'assistant' as const,
                text: 'Done.',
                at: Date.now(),
                status: 'final' as const,
              },
            ];
          });
          if (emittedAck) deps.onAssistantReply?.('Done.');
          thinkingShown = false;
        };
        if (!handled) {
          // Parity with dispatchParsed: forced-id reject → one fuzzy catalog retry.
          let fuzzyHandled = false;
          try {
            const fuzzy = tryDispatchCapabilityCatalog(capDeps, text);
            fuzzyHandled =
              fuzzy && typeof (fuzzy as Promise<unknown>).then === 'function'
                ? await (fuzzy as Promise<boolean>)
                : fuzzy === true;
          } catch {
            fuzzyHandled = false;
          }
          if (aborted()) return;
          if (!fuzzyHandled) replaceThinking(result.reply);
          else ensureVisibleAfterCap();
        } else {
          ensureVisibleAfterCap();
        }
      } else {
        if (aborted()) return;
        const domainTokens =
          deps.pack.gotoDomainTokens ?? deps.pack.normalize?.gotoDomainTokens;
        const trusted =
          autoNav &&
          isAutoExecutableTrustedGoto(
            result.proposed,
            knownStepIds,
            result.reply,
            text,
            domainTokens
          )
            ? result.proposed!.stepId
            : undefined;
        if (trusted) {
          replaceThinking(result.reply);
          queueMicrotask(() => {
            if (signal?.aborted) return;
            deps.executeStepRef.current(trusted, { skipCoach: true });
            patchSession((s) => ({
              ...s,
              discourse: {
                ...(s.discourse ?? {}),
                lastStepId: trusted,
                lastCoachAction: {
                  kind: 'goto',
                  id: trusted,
                  summary: `Opened “${stepTitle(deps.pack, trusted)}”.`,
                },
              },
            }));
          });
        } else if (
          shouldSurfaceTrustedGoto(
            result.proposed,
            knownStepIds,
            result.reply,
            text,
            domainTokens
          )
        ) {
          const stepId = result.proposed!.stepId!;
          replaceThinking(result.reply, stepChoices(deps.pack, [stepId]));
        } else if (
          looksLikeClearOod(text) ||
          (/i can take you to/i.test(result.reply) &&
            !/\b(go|open|take|navigate|show|find)\b/i.test(text))
        ) {
          replaceThinking(defaultOodRefuseReply(text, deps.pack.productRole));
        } else if (
          isTrustedGoto(result.proposed, knownStepIds) &&
          /i can take you to/i.test(result.reply)
        ) {
          replaceThinking(mismatchedGotoClarifyReply(text));
        } else {
          replaceThinking(result.reply);
        }
      }
      if (aborted()) return;
      const exchangeTransport = deps.missLog?.exchangeTransport;
      if (exchangeTransport) {
        logExchangeSafe(
          exchangeTransport.logExchange({
            text,
            kind: missKind,
            packId: deps.missLog?.packId ?? deps.pack.id,
            pathname,
            rawIntent: event.rawIntent,
            confidence: event.confidence,
            at: new Date().toISOString(),
            llmReply: result.reply,
            proposed: result.proposed,
            provider: result.provider,
            exchangeId: result.exchangeId,
          }),
          'missExchange.logExchange'
        );
      }
      } catch {
        if (signal?.aborted) {
          stripThinking();
        } else {
          // Always surface a visible failure — including throws before Thinking…
          // (otherwise the turn stays user-only / silent blank).
          stripThinking();
          deps.onAssistantReply?.(FALLBACK_UNAVAILABLE_REPLY);
          patchMessages((prev) => [
            ...prev.filter((m) => m.id !== thinkingId),
            {
              id: `a-${Date.now()}`,
              role: 'assistant' as const,
              text: FALLBACK_UNAVAILABLE_REPLY,
              at: Date.now(),
              status: 'final' as const,
            },
          ]);
          thinkingShown = false;
        }
      } finally {
        // Busy clear is host-owned via gen-guarded onAsyncFallbackFinished /
        // getAbortSignal / cancelFallback — do not emit onBusyChange(false) here
        // (host ignores false; a mismatched false would be fragile if that changed).
        // Finish when pin gen was claimed (pre-Laya async and/or Laya UI).
        if (typeof fallbackGen === 'number') {
          deps.onAsyncFallbackFinished?.(fallbackGen);
        }
      }
    })();
  };
}
