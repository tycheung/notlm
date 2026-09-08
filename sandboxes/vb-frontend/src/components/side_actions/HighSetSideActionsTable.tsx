import React from 'react';
import Button from '../common/Button';
import { SideAction } from '../../types/side_action';
import {
  effectiveConfigLabel,
  effectiveEntryFeeLabel,
  effectiveGamesLabel,
  formatPoolScopeSummary,
} from '../../features/side-actions/shared';

interface HighSetSideActionsTableProps {
  highSetActions: SideAction[];
  isAuthorizedForManagement: boolean;
  onEdit: (sideActionId: number) => void;
  onViewDetails: (sideActionId: number, name: string) => void;
  onView: (sideActionId: number, name: string) => void;
  onReports: (sideActionId: number, name: string) => void;
  onCopy: (sideAction: SideAction) => void;
  onDelete: (sideActionId: number, name: string) => void;
}

const HighSetSideActionsTable: React.FC<HighSetSideActionsTableProps> = ({
  highSetActions,
  isAuthorizedForManagement,
  onEdit,
  onViewDetails,
  onView,
  onReports,
  onCopy,
  onDelete,
}) => {
  if (highSetActions.length === 0) {
    return (
      <p className="text-sm text-text-muted">No high series pots for this event yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm" aria-label="High Series side actions">
        <thead>
          <tr className="text-left text-text-muted border-b border-border">
            <th scope="col" className="py-2 pr-3">Name</th>
            <th scope="col" className="py-2 pr-3">Scoring</th>
            <th scope="col" className="py-2 pr-3">Games</th>
            <th scope="col" className="py-2 pr-3">Entry fee</th>
            <th scope="col" className="py-2 pr-3">Entries</th>
            <th scope="col" className="py-2 pr-3">Status</th>
            {isAuthorizedForManagement && (
              <th scope="col" className="py-2 pr-3">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {highSetActions.map((sa) => {
            return (
              <tr key={sa.id} className="border-b border-border/60">
                <td className="py-2 pr-3 font-medium text-text">
                  <div className="flex flex-col gap-1">
                    <span>{sa.name}</span>
                    <span className="text-xs font-normal text-text-muted">
                      {formatPoolScopeSummary(sa)}
                    </span>
                  </div>
                </td>
                <td className="py-2 pr-3 capitalize">
                  {effectiveConfigLabel(sa, (cfg) => {
                    const scoring = String(cfg.handicap_mode || 'handicap');
                    const mode =
                      cfg.series_mode === 'best_n'
                        ? `best ${Number(cfg.best_n) || 1}`
                        : 'sum';
                    return `${scoring} · ${mode}`;
                  })}
                </td>
                <td className="py-2 pr-3">{effectiveGamesLabel(sa)}</td>
                <td className="py-2 pr-3">{effectiveEntryFeeLabel(sa)}</td>
                <td className="py-2 pr-3">{sa.current_entries ?? 0}</td>
                <td className="py-2 pr-3">{sa.status_label || sa.status}</td>
                {isAuthorizedForManagement && (
                  <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="lightbackground"
                      size="small"
                      aria-label={`Edit ${sa.name}`}
                      onClick={() => onEdit(sa.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="lightbackground"
                      size="small"
                      aria-label={`Copy ${sa.name}`}
                      onClick={() => onCopy(sa)}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="lightbackground"
                      size="small"
                      aria-label={`View entry details for ${sa.name}`}
                      onClick={() => onViewDetails(sa.id, sa.name)}
                    >
                      Details
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      aria-label={`View standings for ${sa.name}`}
                      onClick={() => onView(sa.id, sa.name)}
                    >
                      View
                    </Button>
                    <Button
                      variant="lightbackground"
                      size="small"
                      aria-label={`Open reports for ${sa.name}`}
                      onClick={() => onReports(sa.id, sa.name)}
                    >
                      Reports
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      aria-label={`Delete ${sa.name}`}
                      onClick={() => onDelete(sa.id, sa.name)}
                    >
                      Delete
                    </Button>
                  </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default HighSetSideActionsTable;
