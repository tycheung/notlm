import { EventCreate, EventUpdate } from '../types/event';

/** Shared persisted shape for EventForm (create and edit flows). */
export interface EventFormPersistedDraft {
  v: 1;
  formValues: Partial<EventCreate | EventUpdate>;
  /** Legacy drafts only — merged into formValues on load. */
  houseCutPercentage?: number;
  houseCutAmount?: number;
}
