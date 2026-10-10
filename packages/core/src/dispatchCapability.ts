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
import { stepTitle } from './dispatchResolve.js';
import { normalizeUtterance } from './normalizeConfig.js';

function surfaceStepFromMutationSlots(
  slots: Record<string, unknown> | undefined
): string | undefined {
  if (!slots) return undefined;
  for (const key of ['tournamentName', 'centerName', 'tournamentId', 'centerId']) {
    const v = slots[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}

function pushAnswer(deps: DispatchDeps, answer: QueryAnswer): void {
  const hasText = String(answer.text ?? '').trim().length > 0;
  const hasChips =
    (answer.choices?.length ?? 0) > 0 || (answer.links?.length ?? 0) > 0;
  const willNav = answer.navigatePath != null && answer.autoNavigate === true;
  const willStep = answer.stepId != null && answer.autoStartStep !== false;
  const forceOpenSurface =
    typeof answer.slots?.forceOpenSurface === 'string'
      ? answer.slots.forceOpenSurface
      : undefined;
  if (hasText || hasChips) {
    deps.pushAssistant(answer.text, {
      choices: answer.choices,
      links: answer.links,
    });
  } else if (willNav || willStep) {
    // Side-effect-only answers need a visible ack so Laya empty-bubble guard
    // does not replace the turn with FALLBACK_UNAVAILABLE_REPLY.
    deps.pushAssistant(
      willStep
        ? `Opening “${stepTitle(deps.pack, answer.stepId!)}”.`
        : 'Opening…'
    );
  } else if (forceOpenSurface) {
    deps.pushAssistant('Opening…');
  }
  // Auto-nav only when the host opts in. Informational queries must omit this
  // (or set navigatePath without autoNavigate) so answers do not yank the page.
  if (willNav) {
    deps.navigate?.(answer.navigatePath!);
  }
  // skipCoach: avoid a second bubble from executeStep coach/form nudges.
  // Tours / desk handoffs may return stepId as a chip-only offer (autoStartStep: false).
  if (willStep) {
    const prefill = answer.slots
      ? Object.fromEntries(
          Object.entries(answer.slots).filter(([k]) => k !== 'forceOpenSurface')
        )
      : undefined;
    const surfaceStep = surfaceStepFromMutationSlots(
      answer.slots as Record<string, unknown> | undefined
    );
    deps.executeStep(answer.stepId!, {
      skipCoach: true,
      ...(prefill && Object.keys(prefill).length ? { prefill } : {}),
      ...(forceOpenSurface
        ? {
            forceOpenSurface,
            ...(surfaceStep !== undefined ? { forceSurfaceStep: surfaceStep } : {}),
          }
        : {}),
    });
  } else if (forceOpenSurface && deps.openSurface) {
    deps.openSurface(
      forceOpenSurface,
      surfaceStepFromMutationSlots(answer.slots as Record<string, unknown> | undefined)
    );
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
  const hasText = String(answer.text ?? '').trim().length > 0;
  const forceOpenSurface =
    typeof answer.slots?.forceOpenSurface === 'string'
      ? answer.slots.forceOpenSurface
      : undefined;
  const hasUi =
    (answer.choices?.length ?? 0) > 0 ||
    (answer.links?.length ?? 0) > 0 ||
    (answer.navigatePath != null && answer.autoNavigate === true) ||
    (answer.stepId != null && answer.autoStartStep !== false) ||
    Boolean(forceOpenSurface && deps.openSurface);
  // Empty `{ text: '' }` must not claim handled (blank bubble / double Laya reply).
  if (!hasText && !hasUi) return false;
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
    deps.setSession((s) => {
      const flags = { ...s.flags };
      delete flags.pendingMutation;
      return { ...s, flags };
    });
    deps.pushAssistant('I can’t complete that write from here.');
    return true;
  }
  return (async () => {
    // Clear before await so a second "yes" / double chip tap cannot re-enter
    // (parity with tryHandlePendingDraftApply).
    deps.setSession((s) => {
      const flags = { ...s.flags };
      delete flags.pendingMutation;
      return { ...s, flags };
    });
    try {
      const answer = await Promise.resolve(
        deps.executeMutation!({
          mutationId: pending.mutationId,
          text: pending.text,
          slots: pending.slots,
          ctx: deps.ctx,
        })
      );
      if (answer) {
        const ok = await settleAnswer(deps, answer);
        if (!ok) {
          // Write already ran — empty UI must not look like failure.
          deps.pushAssistant('Done.');
        }
        recordCoachAction(deps, {
          kind: 'mutation',
          id: pending.mutationId,
          summary:
            String(answer.text ?? '').trim().slice(0, 160) ||
            `Completed ${pending.mutationId}`,
        });
      } else {
        // null answer: host resolved without throw — treat as success with ack.
        deps.pushAssistant('Done.');
        recordCoachAction(deps, {
          kind: 'mutation',
          id: pending.mutationId,
          summary: `Completed ${pending.mutationId}`,
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message.trim()
          : 'The action failed.';
      deps.pushAssistant(`That action could not be completed: ${msg}`);
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
    /** Semantic accept only — resolve by id without catalog alias gate. */
    trustedQueryId?: boolean;
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
  // When any forced catalog id is present, skip global fuzzy for other kinds in
  // this call — try each forced id in order; dispatchParsed fuzzy-retries on miss.
  const hasForcedCatalogId = Boolean(
    opts?.queryId || opts?.mutationId || opts?.tourId || opts?.searchId
  );

  // Pre-scan hits so sync callers get `false` when the catalog is a no-op (demo pack).
  let mutationHit: MutationDef | undefined;
  if (opts?.mutationId) {
    const byId = mutations.find((m) => m.id === opts.mutationId);
    const forcedHit = byId
      ? matchMutationEntry([byId], matchText) ||
        matchMutationEntry([byId], trimmed)
      : undefined;
    if (byId && forcedHit) mutationHit = byId;
  } else if (!hasForcedCatalogId) {
    mutationHit =
      matchMutationEntry(mutations, matchText) ||
      matchMutationEntry(mutations, trimmed) ||
      undefined;
  }

  const forcedQueryEntry = opts?.queryId
    ? queries.find((q) => q.id === opts.queryId)
    : undefined;
  const forcedQueryMatch = Boolean(
    forcedQueryEntry &&
      deps.resolveQuery &&
      (opts?.trustedQueryId ||
        matchQueryEntry([forcedQueryEntry], matchText) ||
        matchQueryEntry([forcedQueryEntry], trimmed))
  );

  let globalQueryHit: QueryDef | undefined;
  if (!opts?.queryId && !hasForcedCatalogId) {
    const deskForce =
      looksLikeDeskHandoff(trimmed, deps.pack.compiledHeuristics) &&
      queries.find((q) => /desk|handoff|standup/i.test(q.id));
    globalQueryHit =
      deskForce ||
      matchQueryEntry(queries, matchText) ||
      matchQueryEntry(queries, trimmed) ||
      undefined;
  }

  let tourWork = false;
  if (opts?.tourId) {
    const byId = tours.find((t) => t.id === opts.tourId);
    if (
      byId &&
      (matchTourEntry([byId], matchText) || matchTourEntry([byId], trimmed))
    ) {
      tourWork = true;
    }
  } else if (!hasForcedCatalogId) {
    tourWork = Boolean(
      matchTourEntry(tours, matchText) || matchTourEntry(tours, trimmed)
    );
  }

  let searchWork = false;
  if (opts?.searchId) {
    const byId = search.find((s) => s.id === opts.searchId);
    if (
      byId &&
      (matchSearchEntry([byId], matchText) ||
        matchSearchEntry([byId], trimmed))
    ) {
      searchWork = true;
    }
  } else if (!hasForcedCatalogId) {
    searchWork = Boolean(
      matchSearchEntry(search, matchText) || matchSearchEntry(search, trimmed)
    );
  }

  const needsAsync =
    forcedQueryMatch ||
    Boolean(globalQueryHit && deps.resolveQuery) ||
    Boolean(mutationHit) ||
    tourWork ||
    searchWork;

  if (!needsAsync) return false;

  return (async (): Promise<boolean> => {
  // Forced queryId must alias-match that entry only — never trust id-only proposals.
  if (opts?.queryId) {
    const byId = queries.find((q) => q.id === opts.queryId);
    const forcedHit =
      byId && deps.resolveQuery && !opts.trustedQueryId
        ? matchQueryEntry([byId], matchText) || matchQueryEntry([byId], trimmed)
        : undefined;
    if (
      byId &&
      deps.resolveQuery &&
      (opts.trustedQueryId || forcedHit)
    ) {
      const ok = await settleAnswer(
        deps,
        deps.resolveQuery!({
          queryId: byId.id,
          text: trimmed,
          slots: {},
          ctx: deps.ctx,
        })
      );
      if (ok) {
        recordCoachAction(deps, {
          kind: 'query',
          id: byId.id,
          summary: `Answered ${byId.title}`,
        });
        return true;
      }
      // Empty resolve — fall through to co-passed mutation/tour/search in this call.
    }
    // Alias miss / unknown id: fall through to co-passed mutation/tour/search.
  } else if (!hasForcedCatalogId) {
    const deskForce =
      looksLikeDeskHandoff(trimmed, deps.pack.compiledHeuristics) &&
      queries.find((q) => /desk|handoff|standup/i.test(q.id));

    const queryHit =
      deskForce ||
      matchQueryEntry(queries, matchText) ||
      matchQueryEntry(queries, trimmed);
    if (queryHit && deps.resolveQuery) {
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
      // Empty resolve — fall through to mutation/tour/search in this call.
    }
    // queryHit without resolveQuery: fall through to mutation/tour/search.
  }

  // Forced mutationId must alias-match that entry only — never fuzzy another mutation,
  // and never reject because a *different* mutation won the global catalog match.
  // Otherwise a forced id can open the wrong step when a short-circuit global hit wins
  // (or the reverse: right forced id blocked by a global hit).
  if (mutationHit) {
      const requiresConfirm =
        mutationHit.risk === 'high' || Boolean(mutationHit.confirmPrompt);
      if (!deps.previewMutation) {
        // High-risk / confirmPrompt mutations must not skip the confirm gate
        // when the host left previewMutation unwired.
        if (requiresConfirm) {
          deps.pushAssistant(
            `I can help with “${mutationHit.title}” once it’s wired.`
          );
          return true;
        }
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
        // Catalog alias hit but host declined — fall through to tour/search in this call.
      } else {
      const hostDeclinedHighRiskConfirm =
        preview.needsConfirm === false &&
        !preview.stepId &&
        String(preview.text ?? '').trim().length > 0 &&
        (mutationHit.risk === 'high' || Boolean(mutationHit.confirmPrompt));
      if (hostDeclinedHighRiskConfirm) {
        deps.pushAssistant(String(preview.text).trim());
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
      // Low-risk apply: prefer executeMutation when wired (hosts that commit there),
      // else settle preview with pack stepId fallback.
      let answer: QueryAnswer = {
        text: preview.text ?? '',
        navigatePath: preview.navigatePath,
        autoNavigate: preview.autoNavigate === true,
        stepId: preview.stepId ?? mutationHit.stepId,
        slots: preview.slots,
      };
      let executedRan = false;
      if (deps.executeMutation) {
        try {
          const executed = await Promise.resolve(
            deps.executeMutation({
              mutationId: mutationHit.id,
              text: trimmed,
              slots: preview.slots ?? {},
              ctx: deps.ctx,
            })
          );
          executedRan = true;
          if (executed) {
            // Host already committed — only auto-start a step if execute said so
            // (avoids double-open when executeMutation opened the form).
            answer = {
              text: executed.text ?? answer.text,
              navigatePath: executed.navigatePath ?? answer.navigatePath,
              // Preserve preview autoNavigate when execute omits the flag.
              autoNavigate:
                (executed.autoNavigate ?? answer.autoNavigate) === true,
              // Omit or `null` stepId after a committed write cancels preview
              // navigation (avoids double-open). Return an explicit stepId to nav.
              stepId: executed.stepId,
              autoStartStep: executed.autoStartStep,
              slots: { ...(answer.slots ?? {}), ...(executed.slots ?? {}) },
              choices: executed.choices,
              links: executed.links,
            };
          } else if (
            !(
              answer.stepId ||
              (answer.navigatePath != null && answer.autoNavigate === true)
            )
          ) {
            // null = success with no UI (parity with confirm path).
            deps.pushAssistant('Done.');
            recordCoachAction(deps, {
              kind: 'mutation',
              id: mutationHit.id,
              summary: `Opened ${mutationHit.title}`,
            });
            return true;
          }
          // null execute but preview still has step/nav — settle preview below.
        } catch (err) {
          const msg =
            err instanceof Error && err.message.trim()
              ? err.message.trim()
              : 'The action failed.';
          deps.pushAssistant(`That action could not be completed: ${msg}`);
          return true;
        }
      }
      const ok = await settleAnswer(deps, answer);
      if (!ok) {
        if (executedRan) {
          deps.pushAssistant('Done.');
          recordCoachAction(deps, {
            kind: 'mutation',
            id: mutationHit.id,
            summary: `Opened ${mutationHit.title}`,
          });
          return true;
        }
        if (opts?.mutationId) return false;
        return false;
      }
      recordCoachAction(deps, {
        kind: 'mutation',
        id: mutationHit.id,
        summary:
          String(answer.text ?? '').trim().slice(0, 160) ||
          `Opened ${mutationHit.title}`,
      });
      return true;
      }
  }

  // Forced tourId must alias-match that entry only — never trust id-only proposals.
  if (opts?.tourId) {
    const byId = tours.find((t) => t.id === opts.tourId);
    const forcedHit = byId
      ? matchTourEntry([byId], matchText) || matchTourEntry([byId], trimmed)
      : undefined;
    if (byId && forcedHit) {
        if (deps.runTour) {
          const ok = await settleAnswer(
            deps,
            deps.runTour({ tourId: byId.id, text: trimmed, ctx: deps.ctx })
          );
          if (ok) {
            recordCoachAction(deps, {
              kind: 'tour',
              id: byId.id,
              summary: `Started tour ${byId.title}`,
            });
            return true;
          }
          // Empty host tour — pack static fallback (parity with global tour hit).
        }
        const line = byId.lines?.[0] ?? `Starting “${byId.title}”.`;
        const first = byId.steps[0];
        deps.pushAssistant(
          first
            ? `${line} Say the step name or tap below when you want to open it.`
            : line,
          first ? { choices: [{ id: first, label: first }] } : undefined
        );
        recordCoachAction(deps, {
          kind: 'tour',
          id: byId.id,
          summary: line.slice(0, 160),
        });
        return true;
    }
    // Alias miss — fall through to co-passed searchId.
  } else if (!hasForcedCatalogId) {
    const tourHit =
      matchTourEntry(tours, matchText) || matchTourEntry(tours, trimmed);
    if (tourHit) {
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
    }
  }

  // Forced searchId must alias-match that entry only — never trust id-only proposals.
  if (opts?.searchId) {
    const byId = search.find((s) => s.id === opts.searchId);
    const forcedHit = byId
      ? matchSearchEntry([byId], matchText) ||
        matchSearchEntry([byId], trimmed)
      : undefined;
    if (byId && forcedHit) {
        if (deps.openSearchHit) {
          const ok = await settleAnswer(
            deps,
            deps.openSearchHit({
              searchId: byId.id,
              text: trimmed,
              ctx: deps.ctx,
            })
          );
          if (ok) return true;
          // Empty host search — pack path/step fallback (parity with global hit).
        }
        deps.pushAssistant(`Opening “${byId.title}”.`);
        if (byId.path) deps.navigate?.(byId.path);
        if (byId.stepId) deps.executeStep(byId.stepId, { skipCoach: true });
        return true;
    }
  } else if (!hasForcedCatalogId) {
    const searchHit =
      matchSearchEntry(search, matchText) || matchSearchEntry(search, trimmed);
    if (searchHit) {
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
        if (searchHit.stepId) {
          deps.executeStep(searchHit.stepId, { skipCoach: true });
        }
        return true;
    }
  }

  return false;
  })();
}
