import type { LaneBoardAssignment, LaneBoardLane } from '@/features/lanes/types';

export type LaneGridChip = {
  squad_participant_id: number;
  display_name: string;
  assigned_lane: number | null;
  lane_slot?: number | null;
  lane_label?: string | null;
  pair_conflict?: boolean;
  pair_conflict_title?: string;
};

export type LaneGridColumn = {
  lane: number;
  pair_label?: string;
  capacity: number;
  occupancy: number;
  over_capacity: boolean;
  chips: LaneGridChip[];
};

function toChip(assignment: LaneBoardAssignment): LaneGridChip {
  const conflictMessages = (assignment.pair_conflict_warnings || [])
    .map((w) => w.message)
    .filter(Boolean);
  return {
    squad_participant_id: assignment.squad_participant_id,
    display_name: assignment.display_name,
    assigned_lane: assignment.assigned_lane,
    lane_slot: assignment.lane_slot,
    lane_label: assignment.lane_label,
    pair_conflict: Boolean(assignment.pair_conflict),
    pair_conflict_title: conflictMessages.length
      ? conflictMessages.join(' ')
      : undefined,
  };
}

export function buildLaneGridColumns(
  lanes: LaneBoardLane[] | undefined,
  unassigned: LaneBoardAssignment[] | undefined
): { columns: LaneGridColumn[]; unassigned: LaneGridChip[] } {
  const columns = (lanes || []).map((laneRow) => ({
    lane: laneRow.lane,
    pair_label: laneRow.pair_label,
    capacity: laneRow.capacity,
    occupancy: laneRow.occupancy,
    over_capacity: laneRow.over_capacity,
    chips: laneRow.assignments.map(toChip),
  }));
  return {
    columns,
    unassigned: (unassigned || []).map(toChip),
  };
}

function findChipLocation(
  spId: number,
  columns: LaneGridColumn[],
  unassigned: LaneGridChip[]
): { lane: number | null; chip: LaneGridChip | null } {
  for (const column of columns) {
    const chip = column.chips.find((c) => c.squad_participant_id === spId);
    if (chip) return { lane: column.lane, chip };
  }
  const chip = unassigned.find((c) => c.squad_participant_id === spId) ?? null;
  return { lane: null, chip };
}

function nextFreeSlot(chips: LaneGridChip[], maxPerLane: number): number | null {
  const depth = Math.max(1, maxPerLane);
  const taken = new Set(
    chips
      .map((chip) => chip.lane_slot)
      .filter((slot): slot is number => slot != null && Number.isFinite(slot))
  );
  for (let slot = 0; slot < depth; slot += 1) {
    if (!taken.has(slot)) return slot;
  }
  return null;
}

export function buildDropAssignments(
  activeSpId: number,
  targetLane: number | null,
  columns: LaneGridColumn[],
  unassigned: LaneGridChip[],
  maxPerLane: number
): Array<{
  squad_participant_id: number;
  assigned_lane: number | null;
  lane_slot?: number | null;
}> {
  const { lane: sourceLane, chip: activeChip } = findChipLocation(
    activeSpId,
    columns,
    unassigned
  );
  if (!activeChip) return [];

  if (targetLane == null) {
    return [{ squad_participant_id: activeSpId, assigned_lane: null, lane_slot: null }];
  }

  const targetColumn = columns.find((column) => column.lane === targetLane);
  if (!targetColumn) return [];

  if (sourceLane === targetLane) return [];

  const occupants = targetColumn.chips.filter(
    (chip) => chip.squad_participant_id !== activeSpId
  );

  if (maxPerLane <= 1 && occupants.length === 1 && sourceLane != null) {
    return [
      { squad_participant_id: activeSpId, assigned_lane: targetLane, lane_slot: null },
      {
        squad_participant_id: occupants[0].squad_participant_id,
        assigned_lane: sourceLane,
        lane_slot: occupants[0].lane_slot ?? null,
      },
    ];
  }

  if (occupants.length >= maxPerLane) {
    return [];
  }

  const laneSlot = maxPerLane > 1 ? nextFreeSlot(occupants, maxPerLane) : null;
  return [
    {
      squad_participant_id: activeSpId,
      assigned_lane: targetLane,
      lane_slot: laneSlot,
    },
  ];
}
