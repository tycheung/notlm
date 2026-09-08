import React from 'react';
import Button from '../../../components/common/Button';
import { SideAction } from '../../../types/side_action';
import {
  effectiveConfigLabel,
  effectiveEntryFeeLabel,
  effectiveGamesLabel,
  formatPoolScopeSummary,
} from '../shared';

interface MysteryGameSideActionsTableProps {
  actions: SideAction[];
  isAuthorizedForManagement: boolean;
  onEdit: (sideActionId: number) => void;
  onViewDetails: (sideActionId: number, name: string) => void;
  onGenerate: (sideActionId: number, name: string) => void;
  onView: (sideActionId: number, name: string) => void;
  onReports: (sideActionId: number, name: string) => void;
  onCopy: (sideAction: SideAction) => void;
  onDelete: (sideActionId: number, name: string) => void;
}

const MysteryGameSideActionsTable: React.FC<MysteryGameSideActionsTableProps> = ({
  actions,
  isAuthorizedForManagement,
  onEdit,
  onViewDetails,
  onGenerate,
  onView,
  onReports,
  onCopy,
  onDelete,
}) => {
  if (actions.length === 0) {
    return (
      <p className="text-sm text-text-muted">No mystery game pots for this event yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm" aria-label="Mystery Game side actions">
        <thead>
          <tr className="text-left text-text-muted border-b border-border">
            <th scope="col" className="py-2 pr-3">Name</th>
            <th scope="col" className="py-2 pr-3">Scoring</th>
            <th scope="col" className="py-2 pr-3">Games</th>
            <th scope="col" className="py-2 pr-3">Range</th>
            <th scope="col" className="py-2 pr-3">No match</th>
            <th scope="col" className="py-2 pr-3">Entry fee</th>
            <th scope="col" className="py-2 pr-3">Entries</th>
            <th scope="col" className="py-2 pr-3">Status</th>
            <th scope="col" className="py-2 pr-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((sa) => (
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
                {effectiveConfigLabel(sa, (cfg) =>
                  String(cfg.handicap_mode || 'scratch')
                )}
              </td>
              <td className="py-2 pr-3">
                {effectiveConfigLabel(sa, (cfg) =>
                  cfg.game_scope === 'all_games_pool'
                    ? `All · ${effectiveGamesLabel(sa)}`
                    : effectiveGamesLabel(sa)
                )}
              </td>
              <td className="py-2 pr-3 text-xs">
                {effectiveConfigLabel(sa, (cfg) =>
                  `${cfg.min_mystery_score ?? 0}–${cfg.max_mystery_score ?? 300}`
                )}
              </td>
              <td className="py-2 pr-3 text-xs capitalize">
                {effectiveConfigLabel(sa, (cfg) =>
                  String(cfg.no_match_policy || 'closest')
                )}
              </td>
              <td className="py-2 pr-3">{effectiveEntryFeeLabel(sa)}</td>
              <td className="py-2 pr-3">{sa.current_entries ?? 0}</td>
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
                        onClick={() => onGenerate(sa.id, sa.name)}
                      >
                        Generate
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
                    variant="lightbackground"
                    size="small"
                    onClick={() => onView(sa.id, sa.name)}
                  >
                    Results
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MysteryGameSideActionsTable;
