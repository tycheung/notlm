import Button from '../../common/Button';

interface SignupSheetOptionsProps {
  signupMode: 'roster' | 'blank';
  onSignupModeChange: (mode: 'roster' | 'blank') => void;
  entryCells: 'current' | 'blank';
  onEntryCellsChange: (mode: 'current' | 'blank') => void;
  blankPages: number;
  onBlankPagesChange: (pages: number) => void;
  busy: boolean;
  onBack: () => void;
  onPreview: () => void;
}

export default function SignupSheetOptions({
  signupMode,
  onSignupModeChange,
  entryCells,
  onEntryCellsChange,
  blankPages,
  onBlankPagesChange,
  busy,
  onBack,
  onPreview,
}: SignupSheetOptionsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Columns: Name, each active side action, Total ($ owed). Configure names and whether entry
        counts / totals are printed or left blank for handwriting.
      </p>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-text">Name source</legend>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            name="signup-mode"
            checked={signupMode === 'roster'}
            onChange={() => onSignupModeChange('roster')}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Prefill from roster</span>
            <span className="block text-text-muted text-xs">
              Approved event participants listed by name.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            name="signup-mode"
            checked={signupMode === 'blank'}
            onChange={() => {
              onSignupModeChange('blank');
              onEntryCellsChange('blank');
            }}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Blank names</span>
            <span className="block text-text-muted text-xs">
              Empty name rows for walk-up check-in handwriting.
            </span>
          </span>
        </label>
      </fieldset>

      {signupMode === 'blank' && (
        <label className="block text-sm text-text">
          Pages
          <select
            value={blankPages}
            onChange={(event) => onBlankPagesChange(Number(event.target.value))}
            className="mt-1 block w-28 rounded border border-border bg-surface px-2 py-1"
          >
            {Array.from({ length: 20 }, (_, index) => index + 1).map((page) => (
              <option key={page} value={page}>
                {page}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-text-muted">
            Each page is a full sheet of blank name rows.
          </span>
        </label>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-text">Entry columns</legend>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            name="entry-cells"
            checked={entryCells === 'current'}
            onChange={() => onEntryCellsChange('current')}
            disabled={signupMode === 'blank'}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Use current entries</span>
            <span className="block text-text-muted text-xs">
              Print counts already in the system and $ totals (entries × fee for brackets).
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            name="entry-cells"
            checked={entryCells === 'blank' || signupMode === 'blank'}
            onChange={() => onEntryCellsChange('blank')}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Blank</span>
            <span className="block text-text-muted text-xs">
              Leave side-action and Total cells empty for the TD to write.
            </span>
          </span>
        </label>
      </fieldset>

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
}
