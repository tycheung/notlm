/**
 * Action-plane confirm sessions: resolve once, freeze opaque IDs, Yes executes
 * only those IDs. No second name parse on confirm.
 */

import type { ActionRisk } from './actionRisk.js';

export type ConfirmTargetIds = {
  eventId?: number;
  tournamentId?: number;
  centerId?: number;
};

/** Unified action-plane intent frozen at propose time. */
export type ActionIntent = {
  kind: 'draft_apply' | 'mutation' | 'navigate';
  targetIds: ConfirmTargetIds;
  displayLabel: string;
  risk: ActionRisk;
};

export type PendingDraftApply = {
  draftKey: string;
  draft: Record<string, unknown>;
  text?: string;
  /** Display label frozen with the confirm (may include injection chrome). */
  eventLabel?: string;
  /** Opaque target frozen at propose — Yes must not re-resolve by name. */
  eventId?: number;
  tournamentId?: number;
  actionIntent?: ActionIntent;
};

/** Numbered disambiguation before draft-apply confirm. */
export type PendingDraftApplyPick = {
  kind: 'draft_apply_event';
  query: string;
  candidates: Array<{ id: number; name: string }>;
  draftKey: string;
  draft: Record<string, unknown>;
  text?: string;
  tournamentId?: number | null;
};

export type PendingMutationConfirm = {
  mutationId: string;
  slots: Record<string, unknown>;
  text: string;
  /** Opaque ids frozen at preview — merged into execute slots on Yes. */
  targetIds?: ConfirmTargetIds;
  actionIntent?: ActionIntent;
};

export type EntityRow = { id: string; name: string };

function asPositiveInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function entityRows(raw: unknown): EntityRow[] {
  if (!Array.isArray(raw)) return [];
  const out: EntityRow[] = [];
  for (const row of raw) {
    if (row == null || typeof row !== 'object' || Array.isArray(row)) continue;
    const rec = row as Record<string, unknown>;
    const id = rec.id != null ? String(rec.id) : '';
    const name = typeof rec.name === 'string' ? rec.name.trim() : '';
    if (id && name) out.push({ id, name });
  }
  return out;
}

/**
 * Resolve an event name against a **pre-scoped** list (e.g. focused tournament).
 * Exact match wins; unique case-insensitive partial only when exactly one hit.
 */
export function resolveScopedEventByName(
  nameHint: string,
  events: EntityRow[]
):
  | { ok: true; eventId: number; name: string }
  | {
      ok: false;
      reason: 'empty' | 'ambiguous' | 'missing';
      candidates?: Array<{ id: number; name: string }>;
    } {
  const needle = nameHint.trim().toLowerCase();
  if (!needle) return { ok: false, reason: 'empty' };
  const exact = events.find((e) => e.name.toLowerCase() === needle);
  if (exact) {
    const id = asPositiveInt(exact.id);
    if (id == null) return { ok: false, reason: 'missing' };
    return { ok: true, eventId: id, name: exact.name };
  }
  const partial = events.filter((e) => e.name.toLowerCase().includes(needle));
  if (partial.length === 1) {
    const only = partial[0]!;
    const id = asPositiveInt(only.id);
    if (id == null) return { ok: false, reason: 'missing' };
    return { ok: true, eventId: id, name: only.name };
  }
  if (partial.length > 1) {
    const candidates = partial
      .map((e) => {
        const id = asPositiveInt(e.id);
        return id != null ? { id, name: e.name } : null;
      })
      .filter((c): c is { id: number; name: string } => c != null)
      .slice(0, 12);
    return { ok: false, reason: 'ambiguous', candidates };
  }
  return { ok: false, reason: 'missing' };
}

export type DraftApplyTargetResult =
  | {
      ok: true;
      eventId: number;
      tournamentId: number | null;
      eventLabel: string;
      actionIntent: ActionIntent;
    }
  | {
      ok: false;
      message: string;
      ambiguous?: {
        query: string;
        candidates: Array<{ id: number; name: string }>;
        tournamentId: number | null;
      };
    };

/**
 * Resolve draft-apply target once (propose time). Prefer frozen draft ids,
 * then scoped name match within `data.events`, then focused `data.eventId`.
 */
export function resolveDraftApplyTarget(opts: {
  draft: Record<string, unknown>;
  ctxData?: Record<string, unknown> | null;
  /** Optional name hint already extracted by the host compiler. */
  nameHint?: string | null;
}): DraftApplyTargetResult {
  const data = opts.ctxData ?? {};
  const tournamentId = asPositiveInt(data.tournamentId);
  const focusedEventId = asPositiveInt(data.eventId);
  const events = entityRows(data.events);

  const makeOk = (
    eventId: number,
    eventLabel: string
  ): Extract<DraftApplyTargetResult, { ok: true }> => ({
    ok: true,
    eventId,
    tournamentId,
    eventLabel,
    actionIntent: {
      kind: 'draft_apply',
      targetIds: {
        eventId,
        ...(tournamentId != null ? { tournamentId } : {}),
      },
      displayLabel: eventLabel,
      risk: 'mutate',
    },
  });

  const frozenId = asPositiveInt(opts.draft.formatApplyEventId);
  if (frozenId != null) {
    const fromList = events.find((e) => String(e.id) === String(frozenId));
    const label =
      (typeof opts.draft.formatApplyEventName === 'string' &&
      opts.draft.formatApplyEventName.trim()
        ? opts.draft.formatApplyEventName.trim()
        : null) ||
      fromList?.name ||
      (typeof data.eventName === 'string' && data.eventName.trim()
        ? data.eventName.trim()
        : null) ||
      `event ${frozenId}`;
    return makeOk(frozenId, label);
  }

  const named =
    (typeof opts.nameHint === 'string' && opts.nameHint.trim()) ||
    (typeof opts.draft.formatApplyEventName === 'string' &&
      opts.draft.formatApplyEventName.trim()) ||
    '';

  if (named) {
    const hit = resolveScopedEventByName(named, events);
    if (hit.ok) {
      return makeOk(hit.eventId, hit.name);
    }
    if (hit.reason === 'ambiguous' && hit.candidates?.length) {
      return {
        ok: false,
        message: `A few event matches for “${named}” — reply with a number:\n${hit.candidates
          .map((c, i) => `${i + 1}. ${c.name}`)
          .join('\n')}`,
        ambiguous: {
          query: named,
          candidates: hit.candidates,
          tournamentId,
        },
      };
    }
    return {
      ok: false,
      message: `I couldn’t find an event named “${named}” in this tournament. Open it first, or use the exact name.`,
    };
  }

  if (focusedEventId != null) {
    const fromList = events.find((e) => String(e.id) === String(focusedEventId));
    const label =
      (typeof data.eventName === 'string' && data.eventName.trim()
        ? data.eventName.trim()
        : null) ||
      fromList?.name ||
      `event ${focusedEventId}`;
    return makeOk(focusedEventId, label);
  }

  return {
    ok: false,
    message: 'Open an event first, or name which event to apply to.',
  };
}

/** Parse “1” / “2.” style replies for pending draft-apply picks. */
export function parseNumberedPick(
  trimmed: string,
  candidateCount: number
): number | null {
  const m = trimmed.trim().match(/^(\d{1,2})[.)]?\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > candidateCount) return null;
  return n - 1;
}

/** Merge frozen targetIds into mutation slots for execute (Yes path). */
export function mergeFrozenMutationSlots(
  slots: Record<string, unknown>,
  targetIds?: ConfirmTargetIds | null
): Record<string, unknown> {
  if (!targetIds) return { ...slots };
  const out = { ...slots };
  if (targetIds.eventId != null && out.eventId == null) {
    out.eventId = targetIds.eventId;
  }
  if (targetIds.tournamentId != null && out.tournamentId == null) {
    out.tournamentId = targetIds.tournamentId;
  }
  if (targetIds.centerId != null && out.centerId == null) {
    out.centerId = targetIds.centerId;
  }
  return out;
}

export function targetIdsFromMutationSlots(
  slots: Record<string, unknown> | null | undefined
): ConfirmTargetIds | undefined {
  if (!slots) return undefined;
  const eventId = asPositiveInt(slots.eventId);
  const tournamentId = asPositiveInt(slots.tournamentId);
  const centerId = asPositiveInt(slots.centerId);
  if (eventId == null && tournamentId == null && centerId == null) {
    return undefined;
  }
  return {
    ...(eventId != null ? { eventId } : {}),
    ...(tournamentId != null ? { tournamentId } : {}),
    ...(centerId != null ? { centerId } : {}),
  };
}

export function actionIntentFromMutation(opts: {
  mutationId: string;
  slots: Record<string, unknown>;
  displayLabel: string;
}): ActionIntent {
  return {
    kind: 'mutation',
    targetIds: targetIdsFromMutationSlots(opts.slots) ?? {},
    displayLabel: opts.displayLabel,
    risk: 'mutate',
  };
}
