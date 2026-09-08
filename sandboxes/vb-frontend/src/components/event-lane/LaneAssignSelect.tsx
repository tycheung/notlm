import React, { useMemo } from 'react';
import {
  buildLaneSlotOptions,
  currentLaneSelectValue,
  parseLaneSelectValue,
} from '../../features/lanes/slotLabels';

const fieldClass =
  'w-full min-w-[5.5rem] rounded-input border border-border bg-surface-light px-2 py-1.5 text-sm text-text ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50';

export interface LaneAssignSelectProps {
  laneOptions: number[];
  maxPerLane: number;
  assignedLane: number | null;
  laneSlot?: number | null;
  disabled?: boolean;
  ariaLabel: string;
  onAssign: (payload: {
    assigned_lane: number | null;
    lane_slot?: number | null;
  }) => void;
}

const LaneAssignSelect: React.FC<LaneAssignSelectProps> = ({
  laneOptions,
  maxPerLane,
  assignedLane,
  laneSlot,
  disabled = false,
  ariaLabel,
  onAssign,
}) => {
  const slotOptions = useMemo(
    () => buildLaneSlotOptions(laneOptions, maxPerLane),
    [laneOptions, maxPerLane]
  );

  const selectValue = currentLaneSelectValue(assignedLane, laneSlot, maxPerLane);

  return (
    <select
      className={fieldClass}
      aria-label={ariaLabel}
      disabled={disabled}
      value={selectValue}
      onChange={(e) => {
        const parsed = parseLaneSelectValue(e.target.value, maxPerLane);
        if (!parsed) return;
        onAssign(parsed);
      }}
    >
      <option value="">Unassigned</option>
      {slotOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default LaneAssignSelect;
