import React from 'react';
import Button from '../common/Button';
import Label from '../common/Label';
import type { PrizeFundScope } from '../../api/event-reports';

export interface PrizeFundReportOptionsProps {
  tournamentOnly: boolean;
  scope: PrizeFundScope;
  onScopeChange: (scope: PrizeFundScope) => void;
  includeFundSummary: boolean;
  onIncludeFundSummaryChange: (value: boolean) => void;
  includeWinners: boolean;
  onIncludeWinnersChange: (value: boolean) => void;
  busy: boolean;
  onBack: () => void;
  onPreview: () => void;
}

const PrizeFundReportOptions: React.FC<PrizeFundReportOptionsProps> = ({
  tournamentOnly,
  scope,
  onScopeChange,
  includeFundSummary,
  onIncludeFundSummaryChange,
  includeWinners,
  onIncludeWinnersChange,
  busy,
  onBack,
  onPreview,
}) => (
  <div className="space-y-4">
    {!tournamentOnly && (
      <div>
        <Label htmlFor="prize-fund-scope">Scope</Label>
        <select
          id="prize-fund-scope"
          className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          value={scope}
          onChange={(e) => onScopeChange(e.target.value as PrizeFundScope)}
        >
          <option value="event">This event</option>
          <option value="tournament">All events in tournament</option>
        </select>
      </div>
    )}
    {tournamentOnly && (
      <p className="text-sm text-text-muted">
        Tournament scope — one prize-fund section per event.
      </p>
    )}

    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={includeFundSummary}
          onChange={(e) => onIncludeFundSummaryChange(e.target.checked)}
        />
        Fund summary (entries, house cut, net pool)
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={includeWinners}
          onChange={(e) => onIncludeWinnersChange(e.target.checked)}
        />
        Show winners when placements exist
      </label>
    </div>
    <p className="text-xs text-text-muted">
      Mid-event sheets show configured place amounts only. Winner names appear only from
      championship placements — never from live standings.
    </p>

    <div className="flex flex-wrap gap-2 justify-end">
      <Button variant="secondary" size="small" disabled={busy} onClick={onBack}>
        Back
      </Button>
      <Button variant="primary" size="small" disabled={busy} onClick={onPreview}>
        Preview prize fund
      </Button>
    </div>
  </div>
);

export default PrizeFundReportOptions;
