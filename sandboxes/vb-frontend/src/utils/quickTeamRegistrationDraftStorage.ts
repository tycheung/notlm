import { UserRead } from '../types/user';
import { clearDraft, loadDraft, saveDraft } from './modalDraftStorage';

const SCOPE = 'quick-team-registration';

export interface QuickTeamMemberDraft {
  user: UserRead | null;
  isCaptain: boolean;
}

export interface QuickTeamRegistrationPersistedDraft {
  v: 1;
  teamName: string;
  teamMembers: QuickTeamMemberDraft[];
  userSearchTerm: string;
}

export function quickTeamRegKey(eventId: number, teamSize: number): string {
  return `${eventId}:${teamSize}`;
}

export function loadQuickTeamRegistrationDraft(
  eventId: number,
  teamSize: number
): QuickTeamRegistrationPersistedDraft | null {
  return loadDraft<QuickTeamRegistrationPersistedDraft>(
    SCOPE,
    quickTeamRegKey(eventId, teamSize),
    1
  );
}

export function saveQuickTeamRegistrationDraft(
  eventId: number,
  teamSize: number,
  draft: QuickTeamRegistrationPersistedDraft
): void {
  saveDraft(SCOPE, quickTeamRegKey(eventId, teamSize), draft);
}

export function clearQuickTeamRegistrationDraft(eventId: number, teamSize: number): void {
  clearDraft(SCOPE, quickTeamRegKey(eventId, teamSize));
}
