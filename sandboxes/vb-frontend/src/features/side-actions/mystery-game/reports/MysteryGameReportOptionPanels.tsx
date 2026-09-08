import React from 'react';
import Button from '../../../../components/common/Button';
import EntrySummaryScopeField, {
  type EntrySummaryScope,
  entrySummaryCanPreview,
} from '../../../../components/side_actions/reports/EntrySummaryScopeField';

interface MysteryGameEntrySummaryOptionsProps {
  sideActionName: string;
  scope: EntrySummaryScope;
  onScopeChange: (scope: EntrySummaryScope) => void;
  busy: boolean;
  poolSelected: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export const MysteryGameEntrySummaryOptions: React.FC<
  MysteryGameEntrySummaryOptionsProps
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
      Snapshot of entries, mystery range, fund math, spin status, and place prizes.
    </p>
    <EntrySummaryScopeField
      name="mg-entry-summary-scope"
      sideActionName={sideActionName}
      thisLabel="This pot only"
      allTypeLabel="All mystery games"
      allTypeDescription="Every mystery game pot on this event."
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

interface MysteryGameReportOptionsProps {
  busy: boolean;
  canPreview: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export const MysteryGameReportOptions: React.FC<MysteryGameReportOptionsProps> = ({
  busy,
  canPreview,
  onBack,
  onPreview,
}) => (
  <div className="space-y-4">
    <p className="text-sm text-text-muted">
      Mystery number, winner and payout, then misses sorted closest-first for the
      selected pot.
    </p>
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
