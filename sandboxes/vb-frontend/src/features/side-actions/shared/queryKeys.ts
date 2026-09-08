export const sideActionQueryKeys = {
  all: ['side-actions'] as const,
  lists: () => [...sideActionQueryKeys.all, 'list'] as const,
  list: (tournamentId: number, eventId: number) =>
    [...sideActionQueryKeys.lists(), tournamentId, eventId] as const,
  detail: (sideActionId: number) =>
    [...sideActionQueryKeys.all, 'detail', sideActionId] as const,
  pools: (sideActionId: number) =>
    [...sideActionQueryKeys.detail(sideActionId), 'pools'] as const,
  bracketEngine: (sideActionId: number, poolId: number) =>
    [
      ...sideActionQueryKeys.detail(sideActionId),
      'bracket-engine',
      poolId,
    ] as const,
  entrants: (sideActionId: number, poolId?: number) =>
    [
      ...sideActionQueryKeys.detail(sideActionId),
      'entrants',
      poolId ?? 'all',
    ] as const,
  standings: (
    sideActionType: string,
    sideActionId: number,
    poolId?: number
  ) =>
    [
      ...sideActionQueryKeys.detail(sideActionId),
      'standings',
      sideActionType,
      poolId ?? 'all',
    ] as const,
  rosterSignups: (tournamentId: number, eventId: number) =>
    [
      ...sideActionQueryKeys.all,
      'roster-signups',
      tournamentId,
      eventId,
    ] as const,
  eventLockStatus: (eventId: number) =>
    [...sideActionQueryKeys.all, 'event', eventId, 'lock-status'] as const,
};

export const eventSquadQueryKeys = {
  all: ['event-squads'] as const,
  list: (eventId: number) => [...eventSquadQueryKeys.all, eventId] as const,
};
