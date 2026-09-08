export type ScoringParticipantSortOrder = 'assignment' | 'name' | 'starting_lane';

export type StartingLaneSortKey = {
  lane: number | null;
  slot: number | null;
  name: string;
};

export function scoringParticipantDisplayName(participant: Record<string, unknown>): string {
  const user = participant.user as { name?: string } | undefined;
  const name =
    participant.user_name ??
    user?.name ??
    participant.name ??
    participant.display_name ??
    participant.team_name ??
    '';
  return String(name).trim() || 'Unknown';
}

function laneSlotFromLabel(label: string | null | undefined): number | null {
  if (!label) return null;
  const match = String(label).trim().match(/^\d+\s*([A-Za-z])$/);
  if (!match) return null;
  return match[1].toUpperCase().charCodeAt(0) - 65;
}

export function defaultStartingLaneSortKey(
  participant: Record<string, unknown>,
  laneLabelLookup?: Map<string, string>
): StartingLaneSortKey {
  const name = scoringParticipantDisplayName(participant);
  const spId = participant.squadParticipantId ?? participant.squad_participant_id;
  let lane: number | null = null;
  let slot: number | null = null;

  if (spId != null && laneLabelLookup) {
    const label = laneLabelLookup.get(`${spId}:1`);
    if (label) {
      const numMatch = String(label).match(/^(\d+)/);
      if (numMatch) lane = Number(numMatch[1]);
      slot = laneSlotFromLabel(label);
    }
  }

  if (lane == null) {
    const rawLane = participant.assigned_lane;
    if (rawLane != null && Number.isFinite(Number(rawLane))) {
      lane = Number(rawLane);
    }
  }

  return { lane, slot, name };
}

function compareStartingLaneKeys(a: StartingLaneSortKey, b: StartingLaneSortKey): number {
  if (a.lane == null && b.lane == null) {
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  }
  if (a.lane == null) return 1;
  if (b.lane == null) return -1;
  if (a.lane !== b.lane) return a.lane - b.lane;
  const sa = a.slot ?? 999;
  const sb = b.slot ?? 999;
  if (sa !== sb) return sa - sb;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export function sortScoringParticipants<T extends Record<string, unknown>>(
  participants: T[],
  sortOrder: ScoringParticipantSortOrder,
  options?: {
    laneLabelLookup?: Map<string, string>;
    getStartingLaneKey?: (participant: T) => StartingLaneSortKey;
  }
): T[] {
  if (sortOrder === 'assignment' || participants.length <= 1) {
    return participants;
  }

  const copy = [...participants];
  const resolveKey =
    options?.getStartingLaneKey ??
    ((participant: T) => defaultStartingLaneSortKey(participant, options?.laneLabelLookup));

  if (sortOrder === 'name') {
    copy.sort((a, b) =>
      scoringParticipantDisplayName(a).localeCompare(scoringParticipantDisplayName(b), undefined, {
        sensitivity: 'base',
      })
    );
    return copy;
  }

  copy.sort((a, b) => compareStartingLaneKeys(resolveKey(a), resolveKey(b)));
  return copy;
}
