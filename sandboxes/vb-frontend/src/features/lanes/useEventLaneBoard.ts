import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EventLanesAPI } from './api';
import { invalidateEventLaneQueries } from './invalidateEventLaneQueries';
import type { LaneBoardAssignment } from './types';

export type EventLaneAssignmentRow = {
  event_participant_id: number;
  squad_participant_id: number;
  squad_id: number;
  display_name: string;
  assigned_lane: number | null;
  lane_slot?: number | null;
  lane_label?: string | null;
  checked_in?: boolean;
  team_id?: number | null;
};

export function eventLaneBoardQueryKey(
  eventId: number,
  roundId?: number | null,
  squadId?: number | null
) {
  return ['eventLaneBoard', eventId, roundId ?? null, squadId ?? null] as const;
}

export function useEventLaneBoard(
  eventId: number,
  options?: { roundId?: number | null; squadId?: number | null; enabled?: boolean }
) {
  const roundId = options?.roundId ?? null;
  const squadId = options?.squadId ?? null;
  return useQuery({
    queryKey: eventLaneBoardQueryKey(eventId, roundId, squadId),
    enabled: options?.enabled !== false && eventId > 0,
    queryFn: () =>
      EventLanesAPI.getBoard(eventId, {
        round_id: roundId ?? undefined,
        squad_id: squadId ?? undefined,
      }),
  });
}

export function flattenLaneBoardRows(
  lanes: Array<{ assignments: LaneBoardAssignment[] }> | undefined,
  unassigned: LaneBoardAssignment[] | undefined
): EventLaneAssignmentRow[] {
  const rows: EventLaneAssignmentRow[] = [];
  for (const lane of lanes || []) {
    for (const assignment of lane.assignments) {
      rows.push({
        event_participant_id: assignment.event_participant_id,
        squad_participant_id: assignment.squad_participant_id,
        squad_id: assignment.squad_id,
        display_name: assignment.display_name,
        assigned_lane: assignment.assigned_lane,
        lane_slot: assignment.lane_slot,
        lane_label: assignment.lane_label,
        checked_in: assignment.checked_in,
        team_id: assignment.team_id ?? null,
      });
    }
  }
  for (const person of unassigned || []) {
    rows.push({
      event_participant_id: person.event_participant_id,
      squad_participant_id: person.squad_participant_id,
      squad_id: person.squad_id,
      display_name: person.display_name,
      assigned_lane: person.assigned_lane,
      lane_slot: person.lane_slot,
      lane_label: person.lane_label,
      checked_in: person.checked_in,
      team_id: person.team_id ?? null,
    });
  }
  return rows;
}

export function buildLaneAssignmentByEventParticipant(
  rows: EventLaneAssignmentRow[]
): Map<number, EventLaneAssignmentRow> {
  const map = new Map<number, EventLaneAssignmentRow>();
  for (const row of rows) {
    // Prefer first squad ticket if duplicates exist.
    if (!map.has(row.event_participant_id)) {
      map.set(row.event_participant_id, row);
    }
  }
  return map;
}

export type LaneBoardSortKey = 'name' | 'lane';
export type LaneBoardSortDirection = 'asc' | 'desc';

/** Prefer stored slot; fall back to letter in labels like "1A" / "12C". */
function laneSlotSortKey(row: EventLaneAssignmentRow): number | null {
  if (row.lane_slot != null && Number.isFinite(row.lane_slot)) {
    return row.lane_slot;
  }
  const label = row.lane_label?.trim();
  if (!label) return null;
  const match = label.match(/^\d+\s*([A-Za-z])$/);
  if (!match) return null;
  return match[1].toUpperCase().charCodeAt(0) - 65;
}

export function sortLaneAssignmentRows(
  rows: EventLaneAssignmentRow[],
  sortBy: LaneBoardSortKey,
  direction: LaneBoardSortDirection = 'asc'
): EventLaneAssignmentRow[] {
  const copy = [...rows];
  const dir = direction === 'desc' ? -1 : 1;
  if (sortBy === 'name') {
    copy.sort(
      (a, b) =>
        dir *
        a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' })
    );
    return copy;
  }
  copy.sort((a, b) => {
    const aLane = a.assigned_lane;
    const bLane = b.assigned_lane;
    if (aLane == null && bLane == null) {
      return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
    }
    if (aLane == null) return 1;
    if (bLane == null) return -1;
    if (aLane !== bLane) return dir * (aLane - bLane);

    const aSlot = laneSlotSortKey(a);
    const bSlot = laneSlotSortKey(b);
    if (aSlot == null && bSlot == null) {
      return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
    }
    if (aSlot == null) return 1;
    if (bSlot == null) return -1;
    // Letters always A→Z within a lane; only lane numbers follow asc/desc.
    if (aSlot !== bSlot) return aSlot - bSlot;

    return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
  });
  return copy;
}

export function useAssignEventLane(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      squad_participant_id: number;
      assigned_lane: number | null;
      lane_slot?: number | null;
    }) =>
      EventLanesAPI.applyAssignments(eventId, {
        assignments: [input],
      }),
    onSuccess: async () => {
      await invalidateEventLaneQueries(queryClient, eventId);
    },
  });
}
