import { clearDraft, loadDraft, saveDraft } from './modalDraftStorage';
import { EventFormPersistedDraft } from './eventFormDraftTypes';

const SCOPE = 'event-create';
const VERSION = 1 as const;

export interface EventCreateDraft extends EventFormPersistedDraft {
  selectedTemplateId: number | null;
}

export function loadEventCreateDraft(tournamentId: number): EventCreateDraft | null {
  const parsed = loadDraft<EventCreateDraft>(SCOPE, tournamentId, VERSION);
  if (!parsed || typeof parsed.formValues !== 'object') return null;
  return parsed;
}

export function saveEventCreateDraft(tournamentId: number, draft: EventCreateDraft): void {
  saveDraft(SCOPE, tournamentId, draft);
}

/** Shallow-merge partial updates into any existing draft so template + form stay in sync. */
export function mergeEventCreateDraft(
  tournamentId: number,
  partial: Partial<Omit<EventCreateDraft, 'v'>>
): void {
  const existing = loadEventCreateDraft(tournamentId);
  const merged: EventCreateDraft = {
    v: 1,
    formValues:
      partial.formValues !== undefined
        ? { ...existing?.formValues, ...partial.formValues }
        : existing?.formValues ?? {},
    selectedTemplateId:
      partial.selectedTemplateId !== undefined
        ? partial.selectedTemplateId
        : existing?.selectedTemplateId ?? null,
  };
  saveEventCreateDraft(tournamentId, merged);
}

export function clearEventCreateDraft(tournamentId: number): void {
  clearDraft(SCOPE, tournamentId);
}
