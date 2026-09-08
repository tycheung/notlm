import Button from '../../common/Button';
import type { EliminatorReportDisplayMode } from '../../../api/side-actions';
import EntrySummaryScopeField, {
  type EntrySummaryScope,
  entrySummaryCanPreview,
} from './EntrySummaryScopeField';

interface EliminatorEntrySummaryOptionsProps {
  sideActionName: string;
  scope: EntrySummaryScope;
  onScopeChange: (scope: EntrySummaryScope) => void;
  busy: boolean;
  poolSelected: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export function EliminatorEntrySummaryOptions({
  sideActionName,
  scope,
  onScopeChange,
  busy,
  poolSelected,
  onBack,
  onPreview,
}: EliminatorEntrySummaryOptionsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Snapshot of entries, cut schedule from the configured drop rules, expenses, and place
        prizes.
      </p>
      <EntrySummaryScopeField
        name="elim-entry-summary-scope"
        sideActionName={sideActionName}
        thisLabel="This eliminator only"
        allTypeLabel="All eliminators on this event"
        allTypeDescription="Combined totals plus a section per eliminator."
        scope={scope}
        onScopeChange={onScopeChange}
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="lightbackground"
          size="small"
          onClick={onBack}
          disabled={busy}
        >
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
}

interface EliminatorReportOptionsProps {
  displayMode: EliminatorReportDisplayMode;
  onDisplayModeChange: (mode: EliminatorReportDisplayMode) => void;
  columnsAvailable: boolean;
  gameCount: number;
  busy: boolean;
  canPreview: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export function EliminatorReportOptions({
  displayMode,
  onDisplayModeChange,
  columnsAvailable,
  gameCount,
  busy,
  canPreview,
  onBack,
  onPreview,
}: EliminatorReportOptionsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Cut numbers print at the top. Columns layout matches the desk sheet (name + one score
        column per game + prizes). Per-game pages put each game on its own page.
      </p>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-text">Display</legend>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            name="elim-display-mode"
            checked={displayMode === 'columns'}
            onChange={() => onDisplayModeChange('columns')}
            disabled={!columnsAvailable}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Columns (default)</span>
            <span className="block text-text-muted text-xs">
              Games side-by-side. Sorted by furthest game, then that game&apos;s score. Red =
              cut; green = paid. Blank if not alive.
              {!columnsAvailable
                ? ` Available for up to 4 games (this eliminator has ${gameCount}).`
                : ' Available for up to 4 games.'}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            name="elim-display-mode"
            checked={displayMode === 'pages'}
            onChange={() => onDisplayModeChange('pages')}
            className="mt-1"
          />
          <span>
            <span className="font-medium">One game per page</span>
            <span className="block text-text-muted text-xs">
              Cut games stay on one page when possible; final/payout expands across pages
              when the alive field is large. Payouts always shown.
            </span>
          </span>
        </label>
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button
          variant="lightbackground"
          size="small"
          onClick={onBack}
          disabled={busy}
        >
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
}
