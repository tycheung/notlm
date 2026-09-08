import React from 'react';

import type { SquadRead } from '@/types/squad';
import type { SideActionSquadScopeMode } from '@/types/side_action';

interface SquadScopeSectionProps {
  squads: SquadRead[];
  scopeMode: SideActionSquadScopeMode;
  selectedSquadIds: number[];
  onScopeModeChange: (mode: SideActionSquadScopeMode) => void;
  onSelectedSquadIdsChange: (squadIds: number[]) => void;
  isLoading?: boolean;
}

const SquadScopeSection: React.FC<SquadScopeSectionProps> = ({
  squads,
  scopeMode,
  selectedSquadIds,
  onScopeModeChange,
  onSelectedSquadIdsChange,
  isLoading = false,
}) => {
  const selected = new Set(selectedSquadIds);
  const toggleSquad = (squadId: number) => {
    const next = new Set(selected);
    if (next.has(squadId)) {
      next.delete(squadId);
    } else {
      next.add(squadId);
    }
    onSelectedSquadIdsChange([...next].sort((left, right) => left - right));
  };

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-text">Squad coverage</legend>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="squadScopeMode"
            checked={scopeMode === 'all'}
            onChange={() => onScopeModeChange('all')}
          />
          All event squads
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="squadScopeMode"
            checked={scopeMode === 'selected'}
            onChange={() => onScopeModeChange('selected')}
          />
          Selected squads
        </label>
      </div>

      {scopeMode === 'selected' && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {isLoading ? (
            <p className="text-sm text-text-muted">Loading squads…</p>
          ) : (
            squads.map((squad) => (
              <label
                key={squad.id}
                className="inline-flex items-center gap-2 rounded border border-border px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selected.has(squad.id)}
                  onChange={() => toggleSquad(squad.id)}
                />
                <span>{squad.name}</span>
              </label>
            ))
          )}
          {!isLoading && !squads.length && (
            <p className="text-sm text-text-muted">No squads exist for this event.</p>
          )}
        </div>
      )}
    </fieldset>
  );
};

export default SquadScopeSection;
