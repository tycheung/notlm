import type { SlotBag } from '@uipilot/core';

const PREFIX = 'uipilot:draft:';
export const DRAFT_CHANGED_EVENT = 'uipilot:draft-changed';

export type DraftChangedDetail = {
  packId: string;
  draftKey: string;
  draft: SlotBag;
};

export function draftStorageKey(packId: string, draftKey: string): string {
  return `${PREFIX}${packId}:${draftKey}`;
}

function emitDraftChanged(packId: string, draftKey: string, draft: SlotBag): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(DRAFT_CHANGED_EVENT, {
      detail: { packId, draftKey, draft },
    })
  );
}

/** Read coach/host shared draft bag from sessionStorage. */
export function readDraft(packId: string, draftKey: string): SlotBag {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(draftStorageKey(packId, draftKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return { ...(parsed as SlotBag) };
  } catch {
    return {};
  }
}

/** Merge partial slots into the draft bag and persist. */
export function writeDraft(
  packId: string,
  draftKey: string,
  partial: SlotBag
): SlotBag {
  const next = { ...readDraft(packId, draftKey), ...partial };
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(draftStorageKey(packId, draftKey), JSON.stringify(next));
    } catch {
      /* quota / private mode — ignore */
    }
  }
  emitDraftChanged(packId, draftKey, next);
  return next;
}

export function clearDraft(packId: string, draftKey: string): void {
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(draftStorageKey(packId, draftKey));
    } catch {
      /* ignore */
    }
  }
  emitDraftChanged(packId, draftKey, {});
}
