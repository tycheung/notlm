import React from 'react';
import Button from '../../common/Button';
import type { HighGameReportListMode } from '../../../api/side-actions';
import EntrySummaryScopeField, {
  type EntrySummaryScope,
  entrySummaryCanPreview,
} from './EntrySummaryScopeField';

interface HighGameEntrySummaryOptionsProps {
  sideActionName: string;
  scope: EntrySummaryScope;
  onScopeChange: (scope: EntrySummaryScope) => void;
  busy: boolean;
  poolSelected: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export const HighGameEntrySummaryOptions: React.FC<HighGameEntrySummaryOptionsProps> = ({
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
      name="hg-entry-summary-scope"
      sideActionName={sideActionName}
      thisLabel="This pot only"
      allTypeLabel="All high games"
      allTypeDescription="Every high-game pot on this event."
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

interface HighGameReportOptionsProps {
  availableGames: number[];
  selectedGames: number[];
  onSelectedGamesChange: (games: number[]) => void;
  payoutMode: 'per_game' | 'combined';
  listMode: HighGameReportListMode;
  onListModeChange: (mode: HighGameReportListMode) => void;
  busy: boolean;
  optionsLoaded: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export const HighGameReportOptions: React.FC<HighGameReportOptionsProps> = ({
  availableGames,
  selectedGames,
  onSelectedGamesChange,
  payoutMode,
  listMode,
  onListModeChange,
  busy,
  optionsLoaded,
  onBack,
  onPreview,
}) => (
  <div className="space-y-4">
    <p className="text-sm text-text-muted">
      Wall / desk standings sheet. Pick which games to print and whether to show only paid places or
      the full scored list.
    </p>
    <p className="text-sm text-text">
      Pool scoring mode:{' '}
      <span className="font-medium">
        {payoutMode === 'per_game' ? 'Per game' : 'Combined list'}
      </span>
    </p>
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-text">Games to display</legend>
      <div className="flex flex-wrap gap-3">
        {availableGames.map((n) => (
          <label key={n} className="flex items-center text-sm text-text">
            <input
              type="checkbox"
              className="mr-1.5"
              checked={selectedGames.includes(n)}
              onChange={() => {
                if (selectedGames.includes(n)) {
                  const next = selectedGames.filter((g) => g !== n);
                  if (next.length) onSelectedGamesChange(next);
                  return;
                }
                onSelectedGamesChange([...selectedGames, n].sort((a, b) => a - b));
              }}
            />
            Game {n}
          </label>
        ))}
      </div>
    </fieldset>
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-text">List</legend>
      <label className="flex items-start gap-2 text-sm text-text">
        <input
          type="radio"
          name="hg-list-mode"
          checked={listMode === 'winners'}
          onChange={() => onListModeChange('winners')}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Winners only</span>
          <span className="block text-text-muted text-xs">
            Place payouts (paid places). Best for posting cash results.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-text">
        <input
          type="radio"
          name="hg-list-mode"
          checked={listMode === 'all'}
          onChange={() => onListModeChange('all')}
          className="mt-1"
        />
        <span>
          <span className="font-medium">All scored entrants</span>
          <span className="block text-text-muted text-xs">
            Full ranked list for each selected game (or combined list).
          </span>
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
        disabled={busy || !optionsLoaded || selectedGames.length === 0}
      >
        {busy ? 'Building…' : 'Preview'}
      </Button>
    </div>
  </div>
);
