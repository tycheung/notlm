import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  buildDropAssignments,
  buildLaneGridColumns,
  type LaneGridChip,
  type LaneGridColumn,
} from './laneBoardGridModel';

type LaneBoardGridProps = {
  lanes: Parameters<typeof buildLaneGridColumns>[0];
  unassigned: Parameters<typeof buildLaneGridColumns>[1];
  maxPerLane: number;
  disabled?: boolean;
  /** Entire-team-on-one-lane mode: chips are teams, not bowlers. */
  teamSeats?: boolean;
  onApplyAssignments: (
    assignments: Array<{
      squad_participant_id: number;
      assigned_lane: number | null;
      lane_slot?: number | null;
    }>
  ) => void | Promise<void>;
};

function DraggableChip({
  chip,
  disabled,
}: {
  chip: LaneGridChip;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sp-${chip.squad_participant_id}`,
    data: { spId: chip.squad_participant_id },
    disabled,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      title={chip.pair_conflict_title || undefined}
      {...attributes}
      {...listeners}
      className={`w-full rounded-input border px-2 py-1 text-left text-xs shadow-sm ${
        chip.pair_conflict
          ? 'border-warning bg-warning/10 text-text ring-1 ring-warning/50'
          : 'border-border bg-surface-light text-text'
      } ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {chip.pair_conflict ? '⚠ ' : ''}
      {chip.lane_label ? `${chip.display_name} (${chip.lane_label})` : chip.display_name}
    </button>
  );
}

function LaneDropColumn({
  column,
  disabled,
}: {
  column: LaneGridColumn;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane-${column.lane}`,
    data: { lane: column.lane },
    disabled,
  });
  const atCapacity = column.occupancy >= column.capacity;
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[8.5rem] flex-1 rounded-input border p-2 ${
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-surface'
      } ${column.over_capacity ? 'ring-1 ring-warning/60' : ''}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text">
          Lane {column.lane}
          {column.pair_label ? ` (${column.pair_label})` : ''}
        </span>
        <span
          className={`text-xs ${atCapacity ? 'text-warning' : 'text-text-muted'}`}
          title="Occupancy"
        >
          {column.occupancy}/{column.capacity}
        </span>
      </div>
      <div className="space-y-1">
        {column.chips.length === 0 ? (
          <p className="text-xs text-text-muted">Drop here</p>
        ) : (
          column.chips.map((chip) => (
            <DraggableChip key={chip.squad_participant_id} chip={chip} disabled={disabled} />
          ))
        )}
      </div>
    </div>
  );
}

function UnassignedDropZone({
  chips,
  disabled,
  teamSeats,
}: {
  chips: LaneGridChip[];
  disabled?: boolean;
  teamSeats?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'lane-unassigned',
    data: { lane: null },
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-input border p-3 ${
        isOver ? 'border-primary bg-primary/5' : 'border-dashed border-border bg-surface-light'
      }`}
    >
      <h4 className="mb-2 text-sm font-medium text-text">Unassigned</h4>
      <div className="flex flex-wrap gap-2">
        {chips.length === 0 ? (
          <span className="text-xs text-text-muted">
            {teamSeats
              ? 'Drop teams here to unassign'
              : 'Drop bowlers here to unassign'}
          </span>
        ) : (
          chips.map((chip) => (
            <div key={chip.squad_participant_id} className="min-w-[8rem]">
              <DraggableChip chip={chip} disabled={disabled} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const LaneBoardGrid: React.FC<LaneBoardGridProps> = ({
  lanes,
  unassigned,
  maxPerLane,
  disabled = false,
  teamSeats = false,
  onApplyAssignments,
}) => {
  const grid = useMemo(() => buildLaneGridColumns(lanes, unassigned), [lanes, unassigned]);
  const [activeChip, setActiveChip] = useState<LaneGridChip | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const spId = Number(String(event.active.id).replace('sp-', ''));
    const chip =
      grid.columns.flatMap((c) => c.chips).find((c) => c.squad_participant_id === spId) ??
      grid.unassigned.find((c) => c.squad_participant_id === spId) ??
      null;
    setActiveChip(chip);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveChip(null);
    if (disabled || !event.over) return;
    const activeSpId = Number(String(event.active.id).replace('sp-', ''));
    const overId = String(event.over.id);
    const targetLane =
      overId === 'lane-unassigned'
        ? null
        : Number(overId.replace('lane-', ''));
    const assignments = buildDropAssignments(
      activeSpId,
      Number.isFinite(targetLane as number) ? targetLane : null,
      grid.columns,
      grid.unassigned,
      maxPerLane
    );
    if (assignments.length) {
      void onApplyAssignments(assignments);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {grid.columns.map((column) => (
            <LaneDropColumn key={column.lane} column={column} disabled={disabled} />
          ))}
        </div>
        <UnassignedDropZone
          chips={grid.unassigned}
          disabled={disabled}
          teamSeats={teamSeats}
        />
      </div>
      <DragOverlay>
        {activeChip ? (
          <div className="rounded-input border border-primary bg-surface-light px-2 py-1 text-xs text-text shadow-md">
            {activeChip.display_name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default LaneBoardGrid;
