import React from 'react';
import Button from '../common/Button';
import SideActionDeskScopeFilter from './SideActionDeskScopeFilter';
import {
  deskScopeIsFiltered,
  shouldShowDeskScopeFilter,
  type DeskScopeRound,
  type DeskScopeSelection,
} from './sideActionDeskScope';
import type { SideAction } from '../../types/side_action';

interface SideActionDeskToolbarProps {
  rounds: DeskScopeRound[];
  deskScope: DeskScopeSelection;
  onDeskScopeChange: (next: DeskScopeSelection) => void;
  isAuthorizedForManagement: boolean;
  activeSideActions: SideAction[];
  scopedSideActions: SideAction[];
  onCopyAll: () => void;
}

const SideActionDeskToolbar: React.FC<SideActionDeskToolbarProps> = ({
  rounds,
  deskScope,
  onDeskScopeChange,
  isAuthorizedForManagement,
  activeSideActions,
  scopedSideActions,
  onCopyAll,
}) => {
  const filtered = deskScopeIsFiltered(deskScope);
  const copyCount = filtered ? scopedSideActions.length : activeSideActions.length;
  const showDeskTools =
    isAuthorizedForManagement &&
    activeSideActions.length > 0 &&
    shouldShowDeskScopeFilter(rounds);

  if (!showDeskTools && !shouldShowDeskScopeFilter(rounds)) {
    return null;
  }

  return (
    <div className="space-y-3">
      {shouldShowDeskScopeFilter(rounds) ? (
        <SideActionDeskScopeFilter
          rounds={rounds}
          selection={deskScope}
          onChange={onDeskScopeChange}
        />
      ) : null}
      {showDeskTools ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="lightbackground"
            size="small"
            onClick={onCopyAll}
            title={
              filtered
                ? 'Copy the filtered side actions to another squad'
                : 'Copy every side action to another squad'
            }
          >
            {filtered ? `Copy filtered (${copyCount})` : `Copy all (${copyCount})`}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default SideActionDeskToolbar;
