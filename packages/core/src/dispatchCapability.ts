/**
 * Dispatch typed capability catalog hits (query / mutation / tour / search /
 * explain_last / contextAsk) via host-injected resolvers.
 */
import {
  looksLikeConfirmNo,
  looksLikeConfirmYes,
  looksLikeContextAsk,
  looksLikeDeskHandoff,
  looksLikeExplainLast,
  matchMutationEntry,
  matchQueryEntry,
  matchSearchEntry,
  matchTourEntry,
  type MutationDef,
  type QueryAnswer,
  type QueryDef,
  type SearchSurfaceDef,
  type TourDef,
} from './capabilityCatalog.js';
import { emitCoachEvent } from './coachEvents.js';
import type { DispatchDeps } from './dispatchDeps.js';
import { normalizeUtterance } from './normalizeConfig.js';
import { pushRepairAssistant } from './repairUi.js';

function pushAnswer(deps: DispatchDeps, answer: QueryAnswer): void {
  deps.pushAssistant(answer.text, {
    choices: answer.choices,
    links: answer.links,
  });
  // Auto-nav only when the host opts in. Informational queries must omit this
  // (or set navigatePath without autoNavigate) so answers do not yank the page.
  if (answer.navigatePath && answer.autoNavigate === true) {
    deps.navigate?.(answer.navigatePath);
  }
  // skipCoach: avoid a second bubble from executeStep coach/form nudges.
  // Tours / soft handoffs may return stepId as a chip-only offer (autoStartStep: false).
  if (answer.stepId && answer.autoStartStep !== false) {
    const forceOpenSurface =
      typeof answer.slots?.forceOpenSurface === 'string'
        ? answer.slots.forceOpenSurface
        : undefined;
    const prefill = answer.slots
      ? Object.fromEntries(
          Object.entries(answer.slots).filter(([k]) => k !== 'forceOpenSurface')
        )
      : undefined;
    deps.executeStep(answer.stepId, {
      skipCoach: true,
      ...(prefill && Object.keys(prefill).length ? { prefill } : {}),
      ...(forceOpenSurface ? { forceOpenSurface } : {}),
    });
  }
}

function recordCoachAction(
  deps: DispatchDeps,
  action: { kind: string; id: string; summary: string }
): void {
  deps.setSession((s) => ({
    ...s,
    discourse: {
      ...(s.discourse ?? {}),
      lastCoachAction: action,
    },
    flags: {
      ...s.flags,
      lastCoachActions: [
        action,
        ...((Array.isArray(s.flags.lastCoachActions)
          ? s.flags.lastCoachActions
          : []) as unknown[]),
      ].slice(0, 8),
    },
  }));
}

async function settleAnswer(
  deps: DispatchDeps,
  pending: QueryAnswer | null | Promise<QueryAnswer | null>
): Promise<boolean> {
  const answer = await Promise.resolve(pending);
  if (!answer) return false;
  pushAnswer(deps, answer);
  return true;
}

export type PendingDraftApply = {
  draftKey: string;
  draft: Record<string, unknown>;
  text?: string;
  eventLabel?: string;
};

/** Confirm-gated draft apply (format / structured drafts). */
export function tryHandlePendingDraftApply(
  deps: DispatchDeps,
  trimmed: string
): boolean | Promise<boolean> {
  const pending = deps.session.flags.pendingDraftApply as
    | PendingDraftApply
    | undefined;
  if (!pending?.draftKey || !pending.draft) return false;

  if (looksLikeConfirmNo(trimmed, deps.pack.compiledHeuristics)) {
    deps.setSession((s) => {
      const flags = { ...s.flags };
      delete flags.pendingDraftApply;
      return { ...s, flags };
    });
    deps.pushAssistant('Canceled — nothing was changed.');
    return true;
  }
  if (!looksLikeConfirmYes(trimmed, deps.pack.compiledHeuristics)) return false;

  return (async () => {
    deps.setSession((s) => {
      const flags = { ...s.flags };
      delete flags.pendingDraftApply;
      return { ...s, flags };
    });
    if (!deps.onApplyDraft) {
      deps.pushAssistant('I can’t apply that draft from here.');
      return true;
    }
    try {
      await Promise.resolve(deps.onApplyDraft(pending.draftKey, pending.draft));
      deps.pushAssistant(
        pending.eventLabel
          ? `Format saved and applied to “${pending.eventLabel}”.`
          : 'Format saved and applied.'
      );
      recordCoachAction(deps, {
        kind: 'draft_apply',
        id: pending.draftKey,
        summary: `Applied draft ${pending.draftKey}`,
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message.trim()
          : 'The server rejected the apply.';
      deps.pushAssistant(`Could not apply the format: ${msg}`);
    }
    return true;
  })();
}

/**
 * Bare Cancel/No with no pending confirm must not fall through to Laya
 * (which may invent “cancel this event”).
 */
export function tryHandleOrphanConfirmNo(
  deps: DispatchDeps,
  trimmed: string
): boolean {
  // Chip-like cancels only — bare "no"/"nope" is common NLU noise and must
  // not short-circuit synonym / discourse suites.
  const n = trimmed.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!/^(cancel|stop|never mind|nevermind)$/.test(n)) return false;
  const pendingMut = deps.session.flags.pendingMutation;
  const pendingDraft = deps.session.flags.pendingDraftApply;
  if (pendingMut || pendingDraft) return false;
  deps.pushAssistant('Nothing pending to cancel.');
  return true;
}

/** Handle pending mutation confirm chip / yes-no. */
export function tryHandlePendingMutationConfirm(
  deps: DispatchDeps,
  trimmed: string
): boolean | Promise<boolean> {
  const pending = deps.session.flags.pendingMutation as
    | { mutationId: string; slots: Record<string, unknown>; text: string }
    | undefined;
  if (!pending?.mutationId) return false;

  if (looksLikeConfirmNo(trimmed, deps.pack.compiledHeuristics)) {
    deps.setSession((s) => {
      const flags = { ...s.flags };
      delete flags.pendingMutation;
      return { ...s, flags };
    });
    deps.pushAssistant('Canceled — nothing was changed.');
    return true;
  }
  if (!looksLikeConfirmYes(trimmed, deps.pack.compiledHeuristics)) return false;
  if (!deps.executeMutation) {
    deps.pushAssistant('I can’t complete that write from here.');
    return true;
  }
  return (async () => {
    const answer = await Promise.resolve(
      deps.executeMutation!({
        mutationId: pending.mutationId,
        text: pending.text,
        slots: pending.slots,
        ctx: deps.ctx,
      })
    );
    deps.setSession((s) => {
      const flags = { ...s.flags };
      delete flags.pendingMutation;
      return { ...s, flags };
    });
    if (answer) {
      pushAnswer(deps, answer);
      recordCoachAction(deps, {
        kind: 'mutation',
        id: pending.mutationId,
        summary: answer.text.slice(0, 160),
      });
    } else {
      deps.pushAssistant('That action could not be completed.');
    }
    return true;
  })();
}

export function tryHandleExplainLast(deps: DispatchDeps, trimmed: string): boolean {
  const phrases =
    deps.pack.explainLastPhrases ?? deps.pack.normalize?.explainLastPhrases;
  if (!looksLikeExplainLast(trimmed, phrases, deps.pack.compiledHeuristics)) return false;
  const last = (deps.session.discourse as { lastCoachAction?: { summary?: string } } | undefined)
    ?.lastCoachAction;
  if (last?.summary) {
    deps.pushAssistant(`Last action: ${last.summary}`);
    return true;
  }
  deps.pushAssistant('I haven’t taken an assistant action in this chat yet.');
  return true;
}

export function tryHandleContextAsk(deps: DispatchDeps, trimmed: string): boolean {
  const phrases =
    deps.pack.contextAskPhrases ?? deps.pack.normalize?.contextAskPhrases;
  if (!looksLikeContextAsk(trimmed, phrases, deps.pack.compiledHeuristics)) return false;
  if (deps.resolveContextAsk) {
    const text = deps.resolveContextAsk({ text: trimmed, ctx: deps.ctx, session: deps.session });
    if (text) {
      deps.pushAssistant(text);
      return true;
    }
  }
  const path = deps.ctx.pathname || 'this page';
  deps.pushAssistant(
    `You’re on ${path}. Ask what’s next on the checklist, or name a step to open.`
  );
  return true;
}

/** Match pack catalogs and invoke host resolvers. */
export function tryDispatchCapabilityCatalog(
  deps: DispatchDeps,
  trimmed: string,
  opts?: {
    queryId?: string | null;
    mutationId?: string | null;
    tourId?: string | null;
    searchId?: string | null;
  }
): boolean | Promise<boolean> {
  const queries = (deps.pack.queries ?? []) as QueryDef[];
  const mutations = (deps.pack.mutations ?? []) as MutationDef[];
  const tours = (deps.pack.tours ?? []) as TourDef[];
  const search = (deps.pack.search ?? []) as SearchSurfaceDef[];
  // Apply pack normalize (create/open verb aliases) before catalog match.
  const matchText = normalizeUtterance(trimmed, deps.pack.normalize) || trimmed;

  const deskForce =
    !opts?.queryId &&
    looksLikeDeskHandoff(trimmed, deps.pack.compiledHeuristics) &&
    queries.find((q) => /desk|handoff|standup/i.test(q.id));

  const queryHit =
    (opts?.queryId && queries.find((q) => q.id === opts.queryId)) ||
    deskForce ||
    matchQueryEntry(queries, matchText) ||
    matchQueryEntry(queries, trimmed);
  if (queryHit && deps.resolveQuery) {
    return (async () => {
      const ok = await settleAnswer(
        deps,
        deps.resolveQuery!({
          queryId: queryHit.id,
          text: trimmed,
          slots: {},
          ctx: deps.ctx,
        })
      );
      if (ok) {
        recordCoachAction(deps, {
          kind: 'query',
          id: queryHit.id,
          summary: `Answered ${queryHit.title}`,
        });
        return true;
      }
      emitCoachEvent(deps, {
        type: 'repair',
        kind: 'unknown',
        text: trimmed,
        rawIntent: `query:${queryHit.id}`,
      });
      pushRepairAssistant(deps, 'unknown', '');
      return true;
    })();
  }
  if (queryHit && !deps.resolveQuery) {
    emitCoachEvent(deps, {
      type: 'repair',
      kind: 'unknown',
      text: trimmed,
      rawIntent: `query:${queryHit.id}`,
    });
    pushRepairAssistant(deps, 'unknown', '');
    return true;
  }

  // Forced mutationId from Laya/LLM must still match utterance aliases.
  // Otherwise "generate the brackets" can open Create Event (handoff CB-04).
  let forcedMutation: MutationDef | undefined;
  if (opts?.mutationId) {
    const byId = mutations.find((m) => m.id === opts.mutationId);
    if (byId) {
      const textHit =
        matchMutationEntry(mutations, matchText) ||
        matchMutationEntry(mutations, trimmed);
      if (textHit?.id === byId.id) forcedMutation = byId;
    }
  }
  const mutationHit =
    forcedMutation ||
    matchMutationEntry(mutations, matchText) ||
    matchMutationEntry(mutations, trimmed);
  if (mutationHit) {
    return (async () => {
      if (!deps.previewMutation) {
        if (mutationHit.stepId) {
          deps.pushAssistant(`Opening “${mutationHit.title}”.`);
          deps.executeStep(mutationHit.stepId, { skipCoach: true });
          return true;
        }
        deps.pushAssistant(`I can help with “${mutationHit.title}” once it’s wired.`);
        return true;
      }
      const preview = await Promise.resolve(
        deps.previewMutation({
          mutationId: mutationHit.id,
          text: trimmed,
          slots: {},
          ctx: deps.ctx,
        })
      );
      if (!preview) {
        emitCoachEvent(deps, {
          type: 'repair',
          kind: 'unknown',
          text: trimmed,
          rawIntent: `mutation:${mutationHit.id}`,
        });
        pushRepairAssistant(deps, 'unknown', '');
        return true;
      }
      const needsConfirm =
        preview.needsConfirm ||
        mutationHit.risk === 'high' ||
        Boolean(mutationHit.confirmPrompt);
      if (needsConfirm) {
        deps.setSession((s) => ({
          ...s,
          flags: {
            ...s.flags,
            pendingMutation: {
              mutationId: mutationHit.id,
              slots: preview.slots ?? {},
              text: trimmed,
            },
          },
        }));
        deps.pushAssistant(
          preview.text ||
            mutationHit.confirmPrompt ||
            `Confirm: ${mutationHit.title}?`,
          {
            choices: [
              { id: 'confirm_yes', label: 'Yes, do it' },
              { id: 'confirm_no', label: 'Cancel' },
            ],
          }
        );
        return true;
      }
      if (preview.navigatePath) deps.navigate?.(preview.navigatePath);
      if (preview.stepId) deps.executeStep(preview.stepId, { skipCoach: true });
      deps.pushAssistant(preview.text);
      recordCoachAction(deps, {
        kind: 'mutation',
        id: mutationHit.id,
        summary: preview.text.slice(0, 160),
      });
      return true;
    })();
  }

  const tourHit =
    (opts?.tourId && tours.find((t) => t.id === opts.tourId)) ||
    matchTourEntry(tours, matchText) ||
    matchTourEntry(tours, trimmed);
  if (tourHit) {
    return (async () => {
      if (deps.runTour) {
        const ok = await settleAnswer(
          deps,
          deps.runTour({ tourId: tourHit.id, text: trimmed, ctx: deps.ctx })
        );
        if (ok) {
          recordCoachAction(deps, {
            kind: 'tour',
            id: tourHit.id,
            summary: `Started tour ${tourHit.title}`,
          });
          return true;
        }
      }
      const line = tourHit.lines?.[0] ?? `Starting “${tourHit.title}”.`;
      const first = tourHit.steps[0];
      // Offer the first step as a chip — never auto-navigate on “give me a tour”.
      deps.pushAssistant(
        first
          ? `${line} Say the step name or tap below when you want to open it.`
          : line,
        first
          ? {
              choices: [{ id: first, label: first }],
            }
          : undefined
      );
      recordCoachAction(deps, {
        kind: 'tour',
        id: tourHit.id,
        summary: line.slice(0, 160),
      });
      return true;
    })();
  }

  const searchHit =
    (opts?.searchId && search.find((s) => s.id === opts.searchId)) ||
    matchSearchEntry(search, matchText) ||
    matchSearchEntry(search, trimmed);
  if (searchHit) {
    return (async () => {
      if (deps.openSearchHit) {
        const ok = await settleAnswer(
          deps,
          deps.openSearchHit({
            searchId: searchHit.id,
            text: trimmed,
            ctx: deps.ctx,
          })
        );
        if (ok) return true;
      }
      deps.pushAssistant(`Opening “${searchHit.title}”.`);
      if (searchHit.path) deps.navigate?.(searchHit.path);
      if (searchHit.stepId) deps.executeStep(searchHit.stepId, { skipCoach: true });
      return true;
    })();
  }

  return false;
}
