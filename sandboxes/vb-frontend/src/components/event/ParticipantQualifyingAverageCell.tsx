import React from 'react';
import InlineEditableCell from '../common/InlineEditableCell';
import QualifyingAveragePicker from './QualifyingAveragePicker';

interface ParticipantQualifyingAverageCellProps {
  eventId: number;
  participantId: number;
  userId: number;
  qualifyingAverage?: number | null;
  disabled?: boolean;
  onPatch: (participantId: number, average: number) => Promise<void>;
}

const ParticipantQualifyingAverageCell: React.FC<ParticipantQualifyingAverageCellProps> = ({
  eventId,
  participantId,
  userId,
  qualifyingAverage,
  disabled = false,
  onPatch,
}) => (
  <div
    className={`flex items-center gap-1 ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    data-guide-id="guide-participant-average"
  >
    <InlineEditableCell
      type="average"
      value={qualifyingAverage}
      onSave={async (value) => {
        await onPatch(participantId, value as number);
      }}
      min={0}
      max={300}
      placeholder="—"
      disabled={disabled}
    />
    <QualifyingAveragePicker
      eventId={eventId}
      userId={userId}
      disabled={disabled}
      onPick={(average) => onPatch(participantId, average)}
    />
  </div>
);

export default ParticipantQualifyingAverageCell;
