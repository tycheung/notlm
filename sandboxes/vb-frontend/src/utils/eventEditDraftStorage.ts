import { clearDraft, loadDraft, saveDraft } from './modalDraftStorage';
import { EventFormPersistedDraft } from './eventFormDraftTypes';

const SCOPE = 'event-edit';
const VERSION = 1;

export type EventEditDraft = EventFormPersistedDraft;

export function loadEventEditDraft(eventId: number): EventEditDraft | null {
  const parsed = loadDraft<EventEditDraft>(SCOPE, eventId, VERSION);
  if (!parsed || typeof parsed.formValues !== 'object') return null;
  return parsed;
}

export function saveEventEditDraft(eventId: number, draft: EventEditDraft): void {
  saveDraft(SCOPE, eventId, draft);
}

export function mergeEventEditDraft(
  eventId: number,
  partial: Partial<Omit<EventEditDraft, 'v'>>
): void {
  const existing = loadEventEditDraft(eventId);
  const merged: EventEditDraft = {
    v: 1,
    formValues:
      partial.formValues !== undefined
        ? { ...existing?.formValues, ...partial.formValues }
        : existing?.formValues ?? {},
  };
  saveEventEditDraft(eventId, merged);
}

export function clearEventEditDraft(eventId: number): void {
  clearDraft(SCOPE, eventId);
}
