import { clearDraft, loadDraft, saveDraft } from './modalDraftStorage';

const SCOPE = 'team-registration';

export interface TeamMemberFormDraft {
  user_id: number | null;
  user_name: string;
  user_email: string;
  user_usbc_id: string | null;
  is_captain: boolean;
  position: number;
}

export interface TeamRegistrationPersistedDraft {
  v: 1;
  teamName: string;
  teamMembers: TeamMemberFormDraft[];
  userSearchTerm: string;
}

export function teamRegistrationKey(eventId: number, teamSize: number): string {
  return `${eventId}:${teamSize}`;
}

export function loadTeamRegistrationDraft(
  eventId: number,
  teamSize: number
): TeamRegistrationPersistedDraft | null {
  return loadDraft<TeamRegistrationPersistedDraft>(
    SCOPE,
    teamRegistrationKey(eventId, teamSize),
    1
  );
}

export function saveTeamRegistrationDraft(
  eventId: number,
  teamSize: number,
  draft: TeamRegistrationPersistedDraft
): void {
  saveDraft(SCOPE, teamRegistrationKey(eventId, teamSize), draft);
}

export function clearTeamRegistrationDraft(eventId: number, teamSize: number): void {
  clearDraft(SCOPE, teamRegistrationKey(eventId, teamSize));
}
