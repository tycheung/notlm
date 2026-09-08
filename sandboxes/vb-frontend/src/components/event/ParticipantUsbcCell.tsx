import React from 'react';
import { EventParticipantWithUser } from '../../types/event_participant';

interface ParticipantUsbcCellProps {
  participant: EventParticipantWithUser;
  onAssignUsbc: (target: { userId: number; name: string }) => void;
}

const ParticipantUsbcCell: React.FC<ParticipantUsbcCellProps> = ({
  participant,
  onAssignUsbc,
}) => {
  if (!participant.user_usbc_id) return null;

  const isPlaceholder = participant.user_usbc_is_placeholder === true;
  return (
    <div className="text-xs text-text-dim">
      {isPlaceholder ? (
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-amber-800 font-medium">Temporary ID</span>
          <span className="font-mono">{participant.user_usbc_id}</span>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              onAssignUsbc({ userId: participant.user_id, name: participant.user_name });
            }}
          >
            Assign real USBC
          </button>
        </span>
      ) : (
        <>USBC: {participant.user_usbc_id}</>
      )}
    </div>
  );
};

export default ParticipantUsbcCell;
