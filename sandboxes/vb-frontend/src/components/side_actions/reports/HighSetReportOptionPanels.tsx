import React from 'react';
import Button from '../../common/Button';
import type { HighSetReportListMode } from '../../../api/side-actions';
import EntrySummaryScopeField, {
  type EntrySummaryScope,
  entrySummaryCanPreview,
} from './EntrySummaryScopeField';

interface HighSetEntrySummaryOptionsProps {
  sideActionName: string;
  scope: EntrySummaryScope;
  onScopeChange: (scope: EntrySummaryScope) => void;
  busy: boolean;
  poolSelected: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export const HighSetEntrySummaryOptions: React.FC<HighSetEntrySummaryOptionsProps> = ({
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
      Snapshot of entries, expenses, prize fund, and configured place prizes.
    </p>
    <EntrySummaryScopeField
      name="hs-entry-summary-scope"
      sideActionName={sideActionName}
      thisLabel="This pot only"
      allTypeLabel="All high series"
      allTypeDescription="Every high-series pot on this event."
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

interface HighSetReportOptionsProps {
  listMode: HighSetReportListMode;
  onListModeChange: (mode: HighSetReportListMode) => void;
  busy: boolean;
  canPreview: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export const HighSetReportOptions: React.FC<HighSetReportOptionsProps> = ({
  listMode,
  onListModeChange,
  busy,
  canPreview,
  onBack,
  onPreview,
}) => (
  <div className="space-y-4">
    <p className="text-sm text-text-muted">
      Series standings with per-game scores and series totals. Choose winners-only or the full scored
      list.
    </p>
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-text">List</legend>
      <label className="flex items-start gap-2 text-sm text-text">
        <input
          type="radio"
          name="hs-list-mode"
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
          name="hs-list-mode"
          checked={listMode === 'all'}
          onChange={() => onListModeChange('all')}
          className="mt-1"
        />
        <span>
          <span className="font-medium">All scored entrants</span>
          <span className="block text-text-muted text-xs">Full ranked series list.</span>
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
