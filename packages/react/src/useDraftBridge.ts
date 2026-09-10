import type { SlotBag } from '@uipilot/core';
import { useCallback, useEffect, useState } from 'react';
import {
  DRAFT_CHANGED_EVENT,
  clearDraft,
  readDraft,
  writeDraft,
  type DraftChangedDetail,
} from './draftBridge.js';

/**
 * Host forms subscribe to the same draft bag the coach writes via `draftKey`.
 */
export function useDraftBridge(
  packId: string,
  draftKey: string
): {
  draft: SlotBag;
  patchDraft: (partial: SlotBag) => SlotBag;
  setDraft: (next: SlotBag) => void;
  clear: () => void;
  reload: () => void;
} {
  const [draft, setDraftState] = useState<SlotBag>(() => readDraft(packId, draftKey));

  const reload = useCallback(() => {
    setDraftState(readDraft(packId, draftKey));
  }, [draftKey, packId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<DraftChangedDetail>).detail;
      if (!detail || detail.packId !== packId || detail.draftKey !== draftKey) return;
      setDraftState(detail.draft);
    };
    window.addEventListener(DRAFT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(DRAFT_CHANGED_EVENT, onChange);
  }, [draftKey, packId]);

  const patchDraft = useCallback(
    (partial: SlotBag) => {
      const next = writeDraft(packId, draftKey, partial);
      setDraftState(next);
      return next;
    },
    [draftKey, packId]
  );

  const setDraft = useCallback(
    (next: SlotBag) => {
      clearDraft(packId, draftKey);
      const saved = writeDraft(packId, draftKey, next);
      setDraftState(saved);
    },
    [draftKey, packId]
  );

  const clear = useCallback(() => {
    clearDraft(packId, draftKey);
    setDraftState({});
  }, [draftKey, packId]);

  return { draft, patchDraft, setDraft, clear, reload };
}
