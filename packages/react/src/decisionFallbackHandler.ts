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
  isTrustedGoto,
  looksLikeClearOod,
  mismatchedGotoClarifyReply,
  sanitizeFallbackReply,
  shouldSurfaceTrustedGoto,
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
  setSession: (updater: (prev: SessionSlots) => SessionSlots) => void;
  sessionRef: { current: SessionSlots };
  executeStepRef: {
    current: (stepId: StepId, opts?: { skipCoach?: boolean }) => void;
  };
  navigate: NavigateFn;
  resolveQuery?: ResolveQueryFn;
  previewMutation?: PreviewMutationFn;
  executeMutation?: ExecuteMutationFn;
  runTour?: RunTourFn;
  openSearchHit?: OpenSearchHitFn;
  getAbortSignal?: () => AbortSignal | undefined;
  onBusyChange?: (busy: boolean) => void;
  onFallbackMissText?: (text: string) => void;
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
    const thinkingId = `thinking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    deps.onBusyChange?.(true);
    deps.setMessages((prev) => [
      ...prev,
      {
        id: thinkingId,
        role: 'assistant' as const,
        text: deps.thinkingLabel,
        at: Date.now(),
        status: 'thinking' as const,
      },
    ]);
    void (async () => {
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
      const signal = deps.getAbortSignal?.();
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
          faqIds: faqIdList.length ? faqIdList : undefined,
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
            deps.setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId
                  ? { ...m, text: partial, status: 'streaming' as const }
                  : m
              )
            );
          },
        },
      });
      deps.onBusyChange?.(false);
      if (signal?.aborted) {
        deps.setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
        return;
      }
      const resolveFaqPackText = (): string | null => {
        const faqId = result?.proposed?.faqId?.trim();
        if (!faqId || result?.proposed?.type !== 'faq') return null;
        const entry = (deps.pack.faq ?? []).find((f) => f.id === faqId);
        const body = entry?.text?.trim();
        return body || null;
      };
      const replaceThinking = (reply: string, choices?: ChatChoice[]) => {
        const cleaned =
          sanitizeFallbackReply(reply, text) ??
          resolveFaqPackText() ??
          FALLBACK_UNAVAILABLE_REPLY;
        deps.setMessages((prev) => {
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
      };
      if (!result) {
        // Never silently drop — always leave a visible outcome.
        // eslint-disable-next-line no-console
        console.warn('[notlm] decision fallback returned null', {
          missKind,
          text: text.slice(0, 120),
        });
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
          session: deps.sessionRef.current,
          ctx: deps.getContext(),
          pushAssistant: (
            reply: string,
            opts?: { choices?: ChatChoice[]; links?: ChatMessageLink[] }
          ) => {
            deps.setMessages((prev) => {
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
          executeStep: deps.executeStepRef.current,
          setSession: (updater: (s: SessionSlots) => SessionSlots) => {
            deps.setSession((prev) => {
              const next = updater(prev);
              deps.sessionRef.current = next;
              return next;
            });
          },
          navigate: (path: string) => deps.navigate(path),
          resolveQuery: deps.resolveQuery,
          previewMutation: deps.previewMutation,
          executeMutation: deps.executeMutation,
          runTour: deps.runTour,
          openSearchHit: deps.openSearchHit,
        };
        const cap = tryDispatchCapabilityCatalog(capDeps, text, {
          queryId: proposed.queryId,
          mutationId: proposed.mutationId,
          tourId: proposed.tourId,
          searchId: proposed.searchId,
        });
        const handled =
          cap && typeof (cap as Promise<unknown>).then === 'function'
            ? await (cap as Promise<boolean>)
            : cap === true;
        if (!handled) {
          replaceThinking(result.reply);
        } else {
          deps.setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
        }
      } else {
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
            deps.executeStepRef.current(trusted, { skipCoach: true });
            deps.setSession((s) => ({
              ...s,
              discourse: {
                ...(s.discourse ?? {}),
                lastStepId: trusted,
                lastCoachAction: {
                  kind: 'goto',
                  id: trusted,
                  summary: `Opened “${trusted}”.`,
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
          replaceThinking(result.reply, [{ id: stepId, label: stepId }]);
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
    })();
  };
}
