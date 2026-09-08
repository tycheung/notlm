import React from 'react';
import Button from '../../../../components/common/Button';
import type { MysteryDoublesReportListMode } from '../../../../api/side-actions';
import EntrySummaryScopeField, {
  type EntrySummaryScope,
  entrySummaryCanPreview,
} from '../../../../components/side_actions/reports/EntrySummaryScopeField';

interface MysteryDoublesEntrySummaryOptionsProps {
  sideActionName: string;
  scope: EntrySummaryScope;
  onScopeChange: (scope: EntrySummaryScope) => void;
  busy: boolean;
  poolSelected: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export const MysteryDoublesEntrySummaryOptions: React.FC<
  MysteryDoublesEntrySummaryOptionsProps
> = ({
  sideActionName,
  scope,
  onScopeChange,
  busy,
  poolSelected,
  onBack,
  onPreview,
}) => (
  <div className="space-y-4">
    <p className="text-sm text-text-muted">
      Snapshot of entries, odd-entrant policy, pairs, fund math, and place prizes.
    </p>
    <EntrySummaryScopeField
      name="md-entry-summary-scope"
      sideActionName={sideActionName}
      thisLabel="This pot only"
      allTypeLabel="All mystery doubles"
      allTypeDescription="Every mystery doubles pot on this event."
      scope={scope}
      onScopeChange={onScopeChange}
    />
    <div className="flex justify-end gap-2">
      <Button variant="lightbackground" size="small" onClick={onBack} disabled={busy}>
        Back
      </Button>
      <Button
        variant="primary"
        size="small"
        onClick={onPreview}
        disabled={busy || !entrySummaryCanPreview(scope, poolSelected)}
      >
        {busy ? 'Building…' : 'Preview'}
      </Button>
    </div>
  </div>
);

interface MysteryDoublesReportOptionsProps {
  listMode: MysteryDoublesReportListMode;
  onListModeChange: (mode: MysteryDoublesReportListMode) => void;
  busy: boolean;
  canPreview: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export const MysteryDoublesReportOptions: React.FC<MysteryDoublesReportOptionsProps> = ({
  listMode,
  onListModeChange,
  busy,
  canPreview,
  onBack,
  onPreview,
}) => (
  <div className="space-y-4">
    <p className="text-sm text-text-muted">
      Pair standings for the configured game. Choose winners-only or all paired teams.
    </p>
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-text">List</legend>
      <label className="flex items-start gap-2 text-sm text-text">
        <input
          type="radio"
          name="md-list-mode"
          checked={listMode === 'winners'}
          onChange={() => onListModeChange('winners')}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Winners only</span>
          <span className="block text-text-muted text-xs">Place payouts (paid places).</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-text">
        <input
          type="radio"
          name="md-list-mode"
          checked={listMode === 'all'}
          onChange={() => onListModeChange('all')}
          className="mt-1"
        />
        <span>
          <span className="font-medium">All paired teams</span>
          <span className="block text-text-muted text-xs">Full ranked doubles list.</span>
        </span>
      </label>
    </fieldset>
    <div className="flex justify-end gap-2">
      <Button variant="lightbackground" size="small" onClick={onBack} disabled={busy}>
        Back
      </Button>
      <Button
        variant="primary"
        size="small"
        onClick={onPreview}
        disabled={busy || !canPreview}
      >
        {busy ? 'Building…' : 'Preview'}
      </Button>
    </div>
  </div>
);
