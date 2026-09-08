import type { EventStructurePayload } from '../constants/defaultEventStructurePayload';

export const WIZARD_DRAFT_SCHEMA = 2 as const;
const STORAGE_PREFIX = 'eventFormatWizardDraft:v';

export type WizardDraftContext =
  | { mode: 'new' }
  | { mode: 'edit'; templateId: number; templateName?: string };

export type EventFormatWizardDraft = {
  draftSchema: typeof WIZARD_DRAFT_SCHEMA;
  userId: number;
  updatedAt: string;
  context: WizardDraftContext;
  payload: EventStructurePayload;
};

function storageKey(userId: number): string {
  return `${STORAGE_PREFIX}${WIZARD_DRAFT_SCHEMA}:${userId}`;
}

export function loadWizardDraft(userId: number): EventFormatWizardDraft | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EventFormatWizardDraft;
    if (parsed.draftSchema !== WIZARD_DRAFT_SCHEMA || parsed.userId !== userId) return null;
    if (!parsed.payload || typeof parsed.payload.version !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWizardDraft(draft: EventFormatWizardDraft): void {
  if (typeof window === 'undefined' || !draft.userId) return;
  try {
    window.localStorage.setItem(storageKey(draft.userId), JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function clearWizardDraft(userId: number): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

export function flushWizardDraftBeforeUnload(userId: number, draft: EventFormatWizardDraft | null): void {
  if (!draft || !userId) return;
  saveWizardDraft(draft);
}
