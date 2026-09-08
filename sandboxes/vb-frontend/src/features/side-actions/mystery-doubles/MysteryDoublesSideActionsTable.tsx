import React from 'react';
import Button from '../../../components/common/Button';
import { SideAction } from '../../../types/side_action';
import {
  effectiveConfigLabel,
  effectiveEntryFeeLabel,
  effectiveGamesLabel,
  formatPoolScopeSummary,
} from '../shared';

interface MysteryDoublesSideActionsTableProps {
  actions: SideAction[];
  isAuthorizedForManagement: boolean;
  onEdit: (sideActionId: number) => void;
  onViewDetails: (sideActionId: number, name: string) => void;
  onView: (sideActionId: number, name: string) => void;
  onDrawPairs: (sideActionId: number, name: string) => void;
  onReports: (sideActionId: number, name: string) => void;
  onCopy: (sideAction: SideAction) => void;
  onDelete: (sideActionId: number, name: string) => void;
}

const MysteryDoublesSideActionsTable: React.FC<MysteryDoublesSideActionsTableProps> = ({
  actions,
  isAuthorizedForManagement,
  onEdit,
  onViewDetails,
  onView,
  onDrawPairs,
  onReports,
  onCopy,
  onDelete,
}) => {
  if (actions.length === 0) {
    return (
      <p className="text-sm text-text-muted">No mystery doubles pots for this event yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm" aria-label="Mystery Doubles side actions">
        <thead>
          <tr className="text-left text-text-muted border-b border-border">
            <th scope="col" className="py-2 pr-3">Name</th>
            <th scope="col" className="py-2 pr-3">Scoring</th>
            <th scope="col" className="py-2 pr-3">Game</th>
            <th scope="col" className="py-2 pr-3">Odd entrants</th>
            <th scope="col" className="py-2 pr-3">Entry fee</th>
            <th scope="col" className="py-2 pr-3">Entries</th>
            <th scope="col" className="py-2 pr-3">Status</th>
            <th scope="col" className="py-2 pr-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((sa) => {
            const entries = sa.current_entries ?? 0;
            const odd = entries > 0 && entries % 2 === 1;
            return (
              <tr key={sa.id} className="border-b border-border/60">
                <td className="py-2 pr-3 font-medium text-text">
                  <div className="flex flex-col gap-1">
                    <span>{sa.name}</span>
                    <span className="text-xs font-normal text-text-muted">
                      {formatPoolScopeSummary(sa)}
                    </span>
                    {odd && (
                      <span className="text-xs font-normal text-pending">
                        Odd entrants — add 1 or refund 1 on draw
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-3 capitalize">
                  {effectiveConfigLabel(sa, (cfg) =>
                    String(cfg.handicap_mode || 'handicap')
                  )}
                </td>
                <td className="py-2 pr-3">{effectiveGamesLabel(sa)}</td>
                <td className="py-2 pr-3 text-xs">
                  {effectiveConfigLabel(sa, (cfg) =>
                    cfg.odd_entrant_policy === 'refund_random'
                      ? 'Refund random'
                      : 'Require even'
                  )}
                </td>
                <td className="py-2 pr-3">{effectiveEntryFeeLabel(sa)}</td>
                <td className="py-2 pr-3">{entries}</td>
                <td className="py-2 pr-3">{sa.status_label || sa.status}</td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-2">
                    {isAuthorizedForManagement && (
                      <>
                        <Button
                          variant="lightbackground"
                          size="small"
                          onClick={() => onEdit(sa.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="lightbackground"
                          size="small"
                          onClick={() => onCopy(sa)}
                        >
                          Copy
                        </Button>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => onDrawPairs(sa.id, sa.name)}
                        >
                          Draw pairs
                        </Button>
                      </>
                    )}
                    <Button
                      variant="lightbackground"
                      size="small"
                      onClick={() => onViewDetails(sa.id, sa.name)}
                    >
                      Details
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => onView(sa.id, sa.name)}
                    >
                      Standings
                    </Button>
                    <Button
                      variant="lightbackground"
                      size="small"
                      onClick={() => onReports(sa.id, sa.name)}
                    >
                      Reports
                    </Button>
                    {isAuthorizedForManagement && (
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => onDelete(sa.id, sa.name)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MysteryDoublesSideActionsTable;
