import React from 'react';

import type { SideAction, SideActionSquadScopeMode } from '@/types/side_action';
import type { SquadRead } from '@/types/squad';

interface ScopeSummaryBannerProps {
  scopeMode: SideActionSquadScopeMode;
  squads: Pick<SquadRead, 'id' | 'name'>[];
  selectedSquadIds: number[];
  pools?: SideAction['pools'];
}

const ScopeSummaryBanner: React.FC<ScopeSummaryBannerProps> = ({
  scopeMode,
  squads,
  selectedSquadIds,
  pools,
}) => {
  const enabledPools = pools?.filter((pool) => pool.is_enabled) ?? [];
  const selectedNames =
    scopeMode === 'all'
      ? squads.map((squad) => squad.name)
      : squads
          .filter((squad) => selectedSquadIds.includes(squad.id))
          .map((squad) => squad.name);
  const names = enabledPools.length
    ? enabledPools.map((pool) => pool.squad_name)
    : selectedNames;

  return (
    <div
      className="rounded border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-text"
      role="status"
    >
      <span className="font-semibold">
        {scopeMode === 'all' ? 'All-squads scope' : 'Selected-squads scope'}:
      </span>{' '}
      {names.length ? names.join(', ') : 'No squads selected'}
      {' '}
      <span className="text-text-muted">
        ({names.length} isolated {names.length === 1 ? 'pool' : 'pools'})
      </span>
    </div>
  );
};

export default ScopeSummaryBanner;
