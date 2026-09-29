/**
 * Dispatch typed capability catalog hits (query / mutation / tour / search /
 * explain_last / contextAsk) via host-injected resolvers.
 */
import {
  looksLikeConfirmNo,
  looksLikeConfirmYes,
  looksLikeContextAsk,
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
import { pushRepairAssistant } from './repairUi.js';

function pushAnswer(deps: DispatchDeps, answer: QueryAnswer): void {
  deps.pushAssistant(answer.text, {
    choices: answer.choices,
    links: answer.links,
  });
  if (answer.navigatePath) deps.navigate?.(answer.navigatePath);
  if (answer.stepId) deps.executeStep(answer.stepId);
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

/** Handle pending mutation confirm chip / yes-no. */
export function tryHandlePendingMutationConfirm(
  deps: DispatchDeps,
  trimmed: string
): boolean | Promise<boolean> {
  const pending = deps.session.flags.pendingMutation as
    | { mutationId: string; slots: Record<string, unknown>; text: string }
    | undefined;
  if (!pending?.mutationId) return false;

  if (looksLikeConfirmNo(trimmed)) {
    deps.setSession((s) => {
      const flags = { ...s.flags };
      delete flags.pendingMutation;
      return { ...s, flags };
    });
    deps.pushAssistant('Canceled — nothing was changed.');
    return true;
  }
  if (!looksLikeConfirmYes(trimmed)) return false;
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
  if (!looksLikeExplainLast(trimmed)) return false;
  const last = (deps.session.discourse as { lastCoachAction?: { summary?: string } } | undefined)
    ?.lastCoachAction;
  if (last?.summary) {
    deps.pushAssistant(`Last action: ${last.summary}`);
    return true;
  }
  deps.pushAssistant('I haven’t taken a coach action in this chat yet.');
  return true;
}

export function tryHandleContextAsk(deps: DispatchDeps, trimmed: string): boolean {
  if (!looksLikeContextAsk(trimmed)) return false;
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

/**
 * Match pack catalogs and invoke host resolvers.
 * Returns true when handled (including async started).
 */
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

  const queryHit =
    (opts?.queryId && queries.find((q) => q.id === opts.queryId)) ||
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

  const mutationHit =
    (opts?.mutationId && mutations.find((m) => m.id === opts.mutationId)) ||
    matchMutationEntry(mutations, trimmed);
  if (mutationHit) {
    return (async () => {
      if (!deps.previewMutation) {
        if (mutationHit.stepId) {
          deps.executeStep(mutationHit.stepId);
          deps.pushAssistant(`Opening “${mutationHit.title}”.`);
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
      if (preview.stepId) deps.executeStep(preview.stepId);
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
      deps.pushAssistant(line);
      const first = tourHit.steps[0];
      if (first) deps.executeStep(first);
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
      if (searchHit.path) deps.navigate?.(searchHit.path);
      if (searchHit.stepId) deps.executeStep(searchHit.stepId);
      deps.pushAssistant(`Opening “${searchHit.title}”.`);
      return true;
    })();
  }

  return false;
}
