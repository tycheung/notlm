import { TournamentCreate } from '../types/tournament';
import { clearDraft, loadDraft, saveDraft } from './modalDraftStorage';

const SCOPE = 'tournament-create';
const VERSION = 1;

export interface TournamentCreatePersistedDraft {
  v: 1;
  formValues: TournamentCreate;
  startDateTime: string | null;
  endDateTime: string | null;
  isEndTimeAutoCalculated: boolean;
}

const DEFAULT_ID = 'new';

export function tournamentCreateDraftId(): string {
  return DEFAULT_ID;
}

export function loadTournamentCreateDraft(): TournamentCreatePersistedDraft | null {
  return loadDraft<TournamentCreatePersistedDraft>(SCOPE, DEFAULT_ID, VERSION);
}

export function saveTournamentCreateDraft(draft: TournamentCreatePersistedDraft): void {
  saveDraft(SCOPE, DEFAULT_ID, draft);
}

export function clearTournamentCreateDraft(): void {
  clearDraft(SCOPE, DEFAULT_ID);
}
