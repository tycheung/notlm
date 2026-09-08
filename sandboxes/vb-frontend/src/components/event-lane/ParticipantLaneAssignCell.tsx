import React from 'react';
import {
  buildLaneAssignmentByEventParticipant,
  flattenLaneBoardRows,
  useAssignEventLane,
  useEventLaneBoard,
} from '../../features/lanes';
import { usePersistedRoundSelection } from '../../features/rounds/usePersistedRoundSelection';
import LaneAssignSelect from './LaneAssignSelect';

interface ParticipantLaneAssignCellProps {
  eventId: number;
  eventParticipantId: number;
  roundId?: number | null;
  canManageLanes?: boolean;
  disabled?: boolean;
}

const ParticipantLaneAssignCell: React.FC<ParticipantLaneAssignCellProps> = ({
  eventId,
  eventParticipantId,
  roundId: roundIdProp,
  canManageLanes = true,
  disabled = false,
}) => {
  const { getPersistedRoundId } = usePersistedRoundSelection(eventId);
  const roundId = roundIdProp ?? getPersistedRoundId();
  const boardQuery = useEventLaneBoard(eventId, { roundId });
  const assignMutation = useAssignEventLane(eventId);

  const rows = flattenLaneBoardRows(boardQuery.data?.lanes, boardQuery.data?.unassigned);
  const byParticipant = buildLaneAssignmentByEventParticipant(rows);
  const current = byParticipant.get(eventParticipantId);
  const maxPerLane = boardQuery.data?.max_per_lane ?? boardQuery.data?.engine?.max_per_lane ?? 1;
  const laneOptions = boardQuery.data?.lanes_in_play?.length
    ? boardQuery.data.lanes_in_play
    : boardQuery.data?.engine?.lanes_in_play || [];

  if (boardQuery.isLoading) {
    return <span className="text-xs text-text-muted">…</span>;
  }

  if (boardQuery.isError) {
    const status = (boardQuery.error as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      return <span className="text-xs text-text-muted">No lane access</span>;
    }
    return <span className="text-xs text-text-muted">Lane data unavailable</span>;
  }

  if (!current) {
    return <span className="text-xs text-text-muted">No squad</span>;
  }

  const displayLabel =
    current.lane_label ??
    (current.assigned_lane != null ? String(current.assigned_lane) : 'Unassigned');

  if (!canManageLanes) {
    return <span className="text-xs text-text">{displayLabel}</span>;
  }

  if (!laneOptions.length) {
    return <span className="text-xs text-text-muted">No pairs set</span>;
  }

  return (
    <LaneAssignSelect
      laneOptions={laneOptions}
      maxPerLane={maxPerLane}
      assignedLane={current.assigned_lane}
      laneSlot={current.lane_slot}
      disabled={disabled || assignMutation.isPending}
      ariaLabel={`Lane for ${current.display_name}`}
      onAssign={(payload) =>
        assignMutation.mutate({
          squad_participant_id: current.squad_participant_id,
          ...payload,
        })
      }
    />
  );
};

export default ParticipantLaneAssignCell;
