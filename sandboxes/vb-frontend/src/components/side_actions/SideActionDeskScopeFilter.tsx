import React, { useMemo } from 'react';
import {
  normalizeDeskScopeSelection,
  shouldShowDeskScopeFilter,
  type DeskScopeRound,
  type DeskScopeSelection,
} from './sideActionDeskScope';
import DestinationSquadPicker from './DestinationSquadPicker';

interface SideActionDeskScopeFilterProps {
  rounds: DeskScopeRound[];
  selection: DeskScopeSelection;
  onChange: (next: DeskScopeSelection) => void;
}

/**
 * Round / squad filter for the director Side Action list so TDs can work
 * one squad at a time after multi-squad setup.
 */
const SideActionDeskScopeFilter: React.FC<SideActionDeskScopeFilterProps> = ({
  rounds,
  selection,
  onChange,
}) => {
  const normalized = useMemo(
    () => normalizeDeskScopeSelection(rounds, selection),
    [rounds, selection]
  );

  if (!shouldShowDeskScopeFilter(rounds)) return null;

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface-light px-4 py-3">
      <DestinationSquadPicker
        idPrefix="sa-desk-scope"
        rounds={rounds}
        selection={normalized}
        onChange={onChange}
        allowAll
        roundLabel="Round"
        squadLabel="Squad"
        roundAriaLabel="Filter side actions by round"
        squadAriaLabel="Filter side actions by squad"
        squadPlaceholder="All squads"
        className="flex flex-wrap items-end gap-4"
      />
      <p className="max-w-md text-xs text-text-muted pb-2">
        Filters the lists below so you can lock and generate for one squad at a time.
      </p>
    </div>
  );
};

export default SideActionDeskScopeFilter;
