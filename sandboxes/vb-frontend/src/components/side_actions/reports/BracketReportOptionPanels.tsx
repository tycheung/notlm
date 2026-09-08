import type { AliveListDisplayMode } from '../../../api/side-actions';
import Button from '../../common/Button';
import { BRACKETS_REPORT_DEFAULT_CHUNK_POTS } from './buildBracketsReportDocument';

export type BracketEntrantOption = {
  user_id: number;
  display_name: string;
  entry_count: number;
};

interface BracketsWallSheetOptionsProps {
  totalKnown: number | null;
  potFrom: number;
  potTo: number;
  onPotFromChange: (value: number) => void;
  onPotToChange: (value: number) => void;
  busy: boolean;
  canPreview: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export function BracketsWallSheetOptions({
  totalKnown,
  potFrom,
  potTo,
  onPotFromChange,
  onPotToChange,
  busy,
  canPreview,
  onBack,
  onPreview,
}: BracketsWallSheetOptionsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Large wall sheets print in chunks of up to {BRACKETS_REPORT_DEFAULT_CHUNK_POTS}{' '}
        pots to avoid browser hangs.
        {totalKnown != null ? ` This pool last reported ${totalKnown} pots.` : ''}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-text">
          Pot from
          <input
            type="number"
            min={1}
            value={potFrom}
            onChange={(e) => onPotFromChange(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 block w-24 border border-border rounded-md bg-surface-light px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm text-text">
          Pot to
          <input
            type="number"
            min={1}
            value={potTo}
            onChange={(e) => onPotToChange(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 block w-24 border border-border rounded-md bg-surface-light px-2 py-1 text-sm"
          />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="lightbackground" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={onPreview}
          disabled={busy || !canPreview}
          isLoading={busy}
        >
          Preview
        </Button>
      </div>
    </div>
  );
}

interface AliveListOptionsProps {
  sideActionName: string;
  scope: 'this' | 'all';
  onScopeChange: (scope: 'this' | 'all') => void;
  displayMode: AliveListDisplayMode;
  onDisplayModeChange: (mode: AliveListDisplayMode) => void;
  asOfGame: number | 'current';
  onAsOfGameChange: (game: number | 'current') => void;
  gameWindow: number[];
  availableGames: number[];
  busy: boolean;
  canPreview: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export function AliveListOptions({
  sideActionName,
  scope,
  onScopeChange,
  displayMode,
  onDisplayModeChange,
  asOfGame,
  onAsOfGameChange,
  gameWindow,
  availableGames,
  busy,
  canPreview,
  onBack,
  onPreview,
}: AliveListOptionsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Live posting sheet for who is still alive. When all pots finish, the list switches to 1st /
        2nd place counts.
      </p>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-text">Scope</legend>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            name="alive-list-scope"
            checked={scope === 'this'}
            onChange={() => onScopeChange('this')}
            className="mt-1"
          />
          <span>
            <span className="font-medium">This bracket set</span>
            <span className="block text-text-muted text-xs">{sideActionName}</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            name="alive-list-scope"
            checked={scope === 'all'}
            onChange={() => onScopeChange('all')}
            className="mt-1"
          />
          <span>
            <span className="font-medium">All bracket sets</span>
            <span className="block text-text-muted text-xs">
              Combined alive counts across every active bracket on this event.
            </span>
          </span>
        </label>
      </fieldset>

      {scope === 'this' ? (
      <label className="block text-sm text-text">
        As of game
        <select
          value={asOfGame === 'current' ? 'current' : String(asOfGame)}
          onChange={(event) => {
            const value = event.target.value;
            onAsOfGameChange(value === 'current' ? 'current' : Number(value));
          }}
          className="mt-1 block w-full max-w-xs rounded border border-border bg-surface px-2 py-1"
        >
          <option value="current">Current progress</option>
          {(gameWindow.length ? gameWindow : availableGames).map((game) => (
            <option
              key={game}
              value={game}
              disabled={availableGames.length > 0 && !availableGames.includes(game)}
            >
              Game {game}
              {availableGames.length > 0 && !availableGames.includes(game)
                ? ' (not scored yet)'
                : ''}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-text-muted">
          Historical as-of rebuilds from seating + scores; requests past scored progress are clamped.
        </span>
      </label>
      ) : (
        <p className="text-xs text-text-muted">
          All-sets view uses current progress for each bracket set.
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-text">Display mode</legend>
        {(
          [
            {
              id: 'bracket_numbers' as const,
              label: 'Bracket numbers',
              hint: 'e.g. 1, 8, 19, 23 (alive in 4)',
            },
            {
              id: 'opponent_names' as const,
              label: 'Opponent names',
              hint: 'e.g. John Smith ×9, Jill Jones ×6',
            },
            {
              id: 'total_only' as const,
              label: 'Total only',
              hint: 'Name and alive count',
            },
          ] as const
        ).map((option) => (
          <label key={option.id} className="flex items-start gap-2 text-sm text-text">
            <input
              type="radio"
              name="alive-display-mode"
              checked={displayMode === option.id}
              onChange={() => onDisplayModeChange(option.id)}
              className="mt-1"
            />
            <span>
              <span className="font-medium">{option.label}</span>
              <span className="block text-text-muted text-xs">{option.hint}</span>
            </span>
          </label>
        ))}
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
}

interface IndividualBracketOptionsProps {
  sideActionName: string;
  entrants: BracketEntrantOption[];
  selectedUserId: number | '';
  onSelectedUserIdChange: (userId: number | '') => void;
  scope: 'this' | 'all';
  onScopeChange: (scope: 'this' | 'all') => void;
  busy: boolean;
  canPreview: boolean;
  onBack: () => void;
  onPreview: () => void;
  entryUnit?: 'bowler' | 'team';
}

export function IndividualBracketOptions({
  sideActionName,
  entrants,
  selectedUserId,
  onSelectedUserIdChange,
  scope,
  onScopeChange,
  busy,
  canPreview,
  onBack,
  onPreview,
  entryUnit = 'bowler',
}: IndividualBracketOptionsProps) {
  const competitorLabel = entryUnit === 'team' ? 'Team' : 'Bowler';
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Pick one {competitorLabel.toLowerCase()}. The report lists every pot they entered with G1–Final scores (winners
        highlighted) and a personal summary with winnings and refunds.
      </p>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-text">Scope</legend>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            name="individual-bracket-scope"
            checked={scope === 'this'}
            onChange={() => onScopeChange('this')}
            className="mt-1"
          />
          <span>
            <span className="font-medium">This bracket only</span>
            <span className="block text-text-muted text-xs">{sideActionName}</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            name="individual-bracket-scope"
            checked={scope === 'all'}
            onChange={() => onScopeChange('all')}
            className="mt-1"
          />
          <span>
            <span className="font-medium">All brackets</span>
            <span className="block text-text-muted text-xs">
              Sections per bracket set; summary totals everything.
            </span>
          </span>
        </label>
      </fieldset>
      {entrants.length === 0 ? (
        <p className="text-sm text-text-muted">No entrants found for this side action.</p>
      ) : (
        <label className="block text-sm text-text">
          {competitorLabel}
          <select
            value={selectedUserId === '' ? '' : String(selectedUserId)}
            onChange={(event) => {
              const value = event.target.value;
              onSelectedUserIdChange(value ? Number(value) : '');
            }}
            className="mt-1 block w-full rounded border border-border bg-surface px-2 py-1.5"
          >
            {entrants.map((entrant) => (
              <option key={entrant.user_id} value={entrant.user_id}>
                {entrant.display_name}
                {entrant.entry_count > 0 ? ` (${entrant.entry_count})` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
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
}
