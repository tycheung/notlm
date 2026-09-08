import React from 'react';
import type { EventParticipantUpdate } from '../../types/event_participant';

interface ParticipantAgeClassTogglesProps {
  isYouth: boolean;
  isSenior: boolean;
  isFemale: boolean;
  disabled?: boolean;
  onChange: (patch: EventParticipantUpdate) => void;
  onFemaleChange: (female: boolean) => void;
}

/** Compact Youth / Senior / Female flags for the event roster. */
const ParticipantAgeClassToggles: React.FC<ParticipantAgeClassTogglesProps> = ({
  isYouth,
  isSenior,
  isFemale,
  disabled = false,
  onChange,
  onFemaleChange,
}) => {
  return (
    <div className="mt-1 flex flex-wrap gap-3 text-xs text-text">
      <label className="inline-flex items-center gap-1">
        <input
          type="checkbox"
          className="rounded"
          checked={isYouth}
          disabled={disabled}
          onChange={() =>
            onChange(
              isYouth
                ? { is_youth: false }
                : { is_youth: true, is_senior: false }
            )
          }
        />
        Youth
      </label>
      <label className="inline-flex items-center gap-1">
        <input
          type="checkbox"
          className="rounded"
          checked={isSenior}
          disabled={disabled}
          onChange={() =>
            onChange(
              isSenior
                ? { is_senior: false }
                : { is_senior: true, is_youth: false }
            )
          }
        />
        Senior
      </label>
      <label className="inline-flex items-center gap-1">
        <input
          type="checkbox"
          className="rounded"
          checked={isFemale}
          disabled={disabled}
          onChange={() => onFemaleChange(!isFemale)}
        />
        Female
      </label>
    </div>
  );
};

export default ParticipantAgeClassToggles;
