import React from 'react';

export interface ScoreBoxInputProps {
  value: number | null;
  disabled?: boolean;
  compact?: boolean;
  ariaLabel?: string;
  /** Override default disabled tooltip (e.g. waiting for prior ladder match). */
  title?: string;
  onChange: (value: number | null) => void;
}

function displayScore(value: number | null | undefined): string {
  if (value == null) return '';
  return String(value);
}

function parseDraft(raw: string): number | null | undefined {
  const next = raw.trim();
  if (next === '') return null;
  const parsed = Number(next);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

/**
 * Local draft while focused; persist only on blur / Enter so typing "226"
 * does not fire three API saves (each can take seconds on match-play).
 */
const ScoreBoxInput: React.FC<ScoreBoxInputProps> = ({
  value,
  disabled = false,
  compact = false,
  ariaLabel,
  title,
  onChange,
}) => {
  const [draft, setDraft] = React.useState(displayScore(value));
  const focusedRef = React.useRef(false);
  const lastCommittedRef = React.useRef<number | null>(value);

  React.useEffect(() => {
    if (focusedRef.current) return;
    setDraft(displayScore(value));
    lastCommittedRef.current = value;
  }, [value]);

  const commit = React.useCallback(() => {
    const parsed = parseDraft(draft);
    if (parsed === undefined) {
      setDraft(displayScore(lastCommittedRef.current));
      return;
    }
    if (parsed === lastCommittedRef.current) return;
    lastCommittedRef.current = parsed;
    onChange(parsed);
  }, [draft, onChange]);

  const widthClass = compact ? 'w-11' : 'w-11';

  return (
    <input
      type="text"
      inputMode="numeric"
      disabled={disabled}
      aria-label={ariaLabel}
      title={
        title ??
        (disabled
          ? 'No game shell yet — sync match structure or lock squads'
          : undefined)
      }
      className={`${widthClass} shrink-0 rounded-md border border-border/80 bg-[#141c2b] px-1 py-2 text-center text-sm text-text-muted focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
      value={draft}
      placeholder="—"
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onBlur={() => {
        focusedRef.current = false;
        commit();
        setDraft(displayScore(lastCommittedRef.current));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
};

export default ScoreBoxInput;
