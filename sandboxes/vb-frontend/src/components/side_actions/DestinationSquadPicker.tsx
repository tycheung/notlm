import React, { useMemo } from 'react';
import {
  normalizeDeskScopeSelection,
  roundOptionLabel,
  squadsAvailableForFilter,
  type DeskScopeRound,
} from './sideActionDeskScope';

export type DestinationSquadSelection = {
  roundId: number | null;
  squadId: number | null;
};

type DestinationSquadPickerProps = {
  rounds: DeskScopeRound[];
  selection: DestinationSquadSelection;
  onChange: (next: DestinationSquadSelection) => void;
  idPrefix: string;
  /** Desk filter: allow "All rounds" / "All squads". Copy flows require a squad. */
  allowAll?: boolean;
  roundLabel?: string;
  squadLabel?: string;
  roundAriaLabel?: string;
  squadAriaLabel?: string;
  squadPlaceholder?: string;
  className?: string;
};

const DestinationSquadPicker: React.FC<DestinationSquadPickerProps> = ({
  rounds,
  selection,
  onChange,
  idPrefix,
  allowAll = false,
  roundLabel = 'Round',
  squadLabel = 'Squad',
  roundAriaLabel,
  squadAriaLabel,
  squadPlaceholder = allowAll ? 'All squads' : 'Select squad…',
  className = 'grid grid-cols-1 gap-4 sm:grid-cols-2',
}) => {
  const normalized = useMemo(
    () => normalizeDeskScopeSelection(rounds, selection),
    [rounds, selection]
  );
  const squadOptions = useMemo(
    () => squadsAvailableForFilter(rounds, normalized.roundId),
    [rounds, normalized.roundId]
  );

  return (
    <div className={className}>
      <div>
        <label
          htmlFor={`${idPrefix}-round`}
          className="mb-1 block text-sm font-medium text-text-muted"
        >
          {roundLabel}
        </label>
        <select
          id={`${idPrefix}-round`}
          aria-label={roundAriaLabel ?? roundLabel}
          className="block w-full rounded-md border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
          value={normalized.roundId ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            const next = normalizeDeskScopeSelection(rounds, {
              roundId: value ? Number(value) : null,
              squadId: normalized.squadId,
            });
            onChange(next);
          }}
        >
          {allowAll ? <option value="">All rounds</option> : null}
          {rounds.map((round) => (
            <option key={round.id} value={round.id}>
              {roundOptionLabel(round)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor={`${idPrefix}-squad`}
          className="mb-1 block text-sm font-medium text-text-muted"
        >
          {squadLabel}
        </label>
        <select
          id={`${idPrefix}-squad`}
          aria-label={squadAriaLabel ?? squadLabel}
          className="block w-full rounded-md border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
          value={normalized.squadId ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            onChange({
              roundId: normalized.roundId,
              squadId: value ? Number(value) : null,
            });
          }}
          required={!allowAll}
        >
          <option value="">{squadPlaceholder}</option>
          {squadOptions.map((squad) => (
            <option key={squad.id} value={squad.id}>
              {squad.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default DestinationSquadPicker;
