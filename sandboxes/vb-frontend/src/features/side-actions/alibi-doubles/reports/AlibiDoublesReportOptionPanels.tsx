import React from 'react';
import Button from '../../../../components/common/Button';
import type { AlibiDoublesReportListMode } from '../../../../api/side-actions';
import EntrySummaryScopeField, {
  type EntrySummaryScope,
  entrySummaryCanPreview,
} from '../../../../components/side_actions/reports/EntrySummaryScopeField';

interface AlibiDoublesEntrySummaryOptionsProps {
  sideActionName: string;
  scope: EntrySummaryScope;
  onScopeChange: (scope: EntrySummaryScope) => void;
  busy: boolean;
  poolSelected: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export const AlibiDoublesEntrySummaryOptions: React.FC<
  AlibiDoublesEntrySummaryOptionsProps
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
      Snapshot of pair tickets, fund math (pairs × fee), and place prizes.
    </p>
    <EntrySummaryScopeField
      name="ad-entry-summary-scope"
      sideActionName={sideActionName}
      thisLabel="This pot only"
      allTypeLabel="All alibi doubles"
      allTypeDescription="Every alibi doubles pot on this event."
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

interface AlibiDoublesReportOptionsProps {
  listMode: AlibiDoublesReportListMode;
  onListModeChange: (mode: AlibiDoublesReportListMode) => void;
  busy: boolean;
  canPreview: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export const AlibiDoublesReportOptions: React.FC<AlibiDoublesReportOptionsProps> = ({
  listMode,
  onListModeChange,
  busy,
  canPreview,
  onBack,
  onPreview,
}) => (
  <div className="space-y-4">
    <p className="text-sm text-text-muted">
      Pair standings for the configured games. Choose winners-only or all pairs.
    </p>
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-text">List</legend>
      <label className="flex items-start gap-2 text-sm text-text">
        <input
          type="radio"
          name="ad-list-mode"
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
          name="ad-list-mode"
          checked={listMode === 'all'}
          onChange={() => onListModeChange('all')}
          className="mt-1"
        />
        <span>
          <span className="font-medium">All pairs</span>
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

interface AlibiDoublesSignupSlipsOptionsProps {
  pages: number;
  onPagesChange: (pages: number) => void;
  busy: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export const AlibiDoublesSignupSlipsOptions: React.FC<
  AlibiDoublesSignupSlipsOptionsProps
> = ({ pages, onPagesChange, busy, onBack, onPreview }) => (
  <div className="space-y-4">
    <p className="text-sm text-text-muted">
      Quarter-page write-in slips: bowler name plus partner names. Print and cut
      into 4s.
    </p>
    <label className="block text-sm text-text">
      Letter pages (4 slips each)
      <input
        type="number"
        min={1}
        max={20}
        className="mt-1 block w-32 rounded-md border border-border bg-surface px-3 py-2"
        value={pages}
        onChange={(e) => onPagesChange(Math.max(1, Number(e.target.value) || 1))}
      />
    </label>
    <div className="flex justify-end gap-2">
      <Button variant="lightbackground" size="small" onClick={onBack} disabled={busy}>
        Back
      </Button>
      <Button variant="primary" size="small" onClick={onPreview} disabled={busy}>
        {busy ? 'Building…' : 'Preview'}
      </Button>
    </div>
  </div>
);
