import type { CreateSideActionRequest } from '../types/side_action';

export type SideActionFormPersistedDraft = {
  v: 2;
  name: string;
  description: string;
  sideActionType: CreateSideActionRequest['side_action_type'];
  entryFee: number;
  maxParticipants: number;
  squadScopeMode: CreateSideActionRequest['squad_scope_mode'];
  selectedSquadIds: number[];
  poolOverrides: CreateSideActionRequest['pool_overrides'];
  typeConfig: CreateSideActionRequest['type_config'];
  houseCutPercentage: number;
  houseCutAmount: number;
  houseCutType: string;
  prizeDistribution: CreateSideActionRequest['prize_distribution'];
  prizeType: string;
};

type LegacySideActionFormDraft = Omit<
  SideActionFormPersistedDraft,
  'v' | 'squadScopeMode' | 'selectedSquadIds' | 'poolOverrides'
> & {
  v: 1;
  startingGame: number;
  numGames: number;
};

function storageKey(
  tournamentId: number,
  eventId: number,
  sideActionKey: number | 'create'
): string {
  return `side-action-draft:v2:${tournamentId}:${eventId}:${sideActionKey}`;
}

function legacyStorageKey(tournamentId: number, sideActionKey: number | 'create'): string {
  return `side-action-draft:${tournamentId}:${sideActionKey}`;
}

function migrateLegacyDraft(draft: LegacySideActionFormDraft): SideActionFormPersistedDraft {
  const startingGame = Math.max(1, Number(draft.startingGame) || 1);
  const numGames = Math.max(1, Number(draft.numGames) || 1);
  const gameNumbers = Array.from({ length: numGames }, (_, index) => startingGame + index);
  return {
    v: 2,
    name: draft.name,
    description: draft.description,
    sideActionType: draft.sideActionType,
    entryFee: draft.entryFee,
    maxParticipants: draft.maxParticipants,
    squadScopeMode: 'all',
    selectedSquadIds: [],
    poolOverrides: {},
    typeConfig: { ...draft.typeConfig, game_numbers: gameNumbers },
    houseCutPercentage: draft.houseCutPercentage,
    houseCutAmount: draft.houseCutAmount,
    houseCutType: draft.houseCutType,
    prizeDistribution: draft.prizeDistribution,
    prizeType: draft.prizeType,
  };
}

export function saveSideActionDraft(
  tournamentId: number,
  eventId: number,
  sideActionKey: number | 'create',
  payload: SideActionFormPersistedDraft
): void {
  try {
    localStorage.setItem(storageKey(tournamentId, eventId, sideActionKey), JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function loadSideActionDraft(
  tournamentId: number,
  eventId: number,
  sideActionKey: number | 'create'
): SideActionFormPersistedDraft | null {
  try {
    const v2Key = storageKey(tournamentId, eventId, sideActionKey);
    const raw = localStorage.getItem(v2Key);
    if (raw) {
      const parsed = JSON.parse(raw) as SideActionFormPersistedDraft;
      return parsed?.v === 2 ? parsed : null;
    }
    // A numeric side-action ID identifies one event unambiguously. The old create key did not.
    if (sideActionKey === 'create') return null;
    const v1Key = legacyStorageKey(tournamentId, sideActionKey);
    const legacyRaw = localStorage.getItem(v1Key);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw) as LegacySideActionFormDraft;
    if (legacy?.v !== 1) return null;
    const migrated = migrateLegacyDraft(legacy);
    localStorage.setItem(v2Key, JSON.stringify(migrated));
    localStorage.removeItem(v1Key);
    return migrated;
  } catch {
    return null;
  }
}

export function clearSideActionDraft(
  tournamentId: number,
  eventId: number,
  sideActionKey: number | 'create'
): void {
  try {
    localStorage.removeItem(storageKey(tournamentId, eventId, sideActionKey));
  } catch {
    // ignore
  }
}
