import { clearDraft, draftStorageKey, loadDraft, saveDraft } from './modalDraftStorage';

const PARTICIPANTS_SCOPE = 'batch-participants';
const TEAM_MEMBERS_SCOPE = 'batch-team-members';

export interface ParticipantRowDraft {
  id: string;
  usbc_id: string;
  first_name: string;
  last_name: string;
  qualifying_average?: string;
  user_id?: number;
  isExisting: boolean;
  isValid: boolean;
}

export interface BatchParticipantsPersistedDraft {
  v: 1;
  participants: ParticipantRowDraft[];
  currentRowIndex: number;
}

export function loadBatchParticipantsDraft(
  eventId: number
): BatchParticipantsPersistedDraft | null {
  return loadDraft<BatchParticipantsPersistedDraft>(PARTICIPANTS_SCOPE, eventId, 1);
}

export function saveBatchParticipantsDraft(
  eventId: number,
  draft: BatchParticipantsPersistedDraft
): void {
  saveDraft(PARTICIPANTS_SCOPE, eventId, draft);
}

export function clearBatchParticipantsDraft(eventId: number): void {
  clearDraft(PARTICIPANTS_SCOPE, eventId);
}

export interface TeamMemberRowDraft {
  id: string;
  usbc_id: string;
  first_name: string;
  last_name: string;
  qualifying_average?: string;
  user_id?: number | null;
  isExisting: boolean;
  isValid: boolean;
  isCaptain?: boolean;
}

export interface TeamDraft {
  id: string;
  /** Optional custom label; empty means backend derives from captain. */
  teamName?: string;
  members: TeamMemberRowDraft[];
}

export interface BatchTeamMembersPersistedDraft {
  v: 1 | 2;
  teams: TeamDraft[];
  currentTeamIndex: number;
}

export function batchTeamMembersKey(eventId: number, teamSize: number): string {
  return `${eventId}:${teamSize}`;
}

function migrateBatchTeamMembersDraft(
  raw: BatchTeamMembersPersistedDraft | null
): BatchTeamMembersPersistedDraft | null {
  if (!raw?.teams?.length) return raw;
  if (raw.v === 2) return raw;
  return {
    v: 2,
    currentTeamIndex: raw.currentTeamIndex ?? 0,
    teams: raw.teams.map((t) => {
      const legacy = t as TeamDraft & { name?: string };
      return {
        id: legacy.id,
        teamName: legacy.teamName ?? legacy.name ?? '',
        members: (legacy.members || []).map((m) => ({
          ...m,
          isCaptain: m.isCaptain ?? false,
        })),
      };
    }),
  };
}

export function loadBatchTeamMembersDraft(
  eventId: number,
  teamSize: number
): BatchTeamMembersPersistedDraft | null {
  const key = batchTeamMembersKey(eventId, teamSize);
  const v2 = loadDraft<BatchTeamMembersPersistedDraft>(TEAM_MEMBERS_SCOPE, key, 2);
  if (v2) return v2;
  try {
    const raw = sessionStorage.getItem(draftStorageKey(TEAM_MEMBERS_SCOPE, key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BatchTeamMembersPersistedDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.v === 1) return migrateBatchTeamMembersDraft(parsed);
  } catch {
    return null;
  }
  return null;
}

export function saveBatchTeamMembersDraft(
  eventId: number,
  teamSize: number,
  draft: BatchTeamMembersPersistedDraft
): void {
  saveDraft(TEAM_MEMBERS_SCOPE, batchTeamMembersKey(eventId, teamSize), {
    ...draft,
    v: 2,
  });
}

export function clearBatchTeamMembersDraft(eventId: number, teamSize: number): void {
  clearDraft(TEAM_MEMBERS_SCOPE, batchTeamMembersKey(eventId, teamSize));
}
