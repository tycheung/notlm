import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RosterSideActionColumn,
  RosterSideActionSignupRow,
} from '../../api/side-actions';

interface RosterRolloverControlProps {
  enabled: boolean;
  targetIds: number[];
  availableBrackets: RosterSideActionColumn[];
  disabled: boolean;
  pending: boolean;
  bowlerName: string;
  onSave: (enabled: boolean, targetIds: number[]) => void;
}

const RosterRolloverControl: React.FC<RosterRolloverControlProps> = ({
  enabled,
  targetIds,
  availableBrackets,
  disabled,
  pending,
  bowlerName,
  onSave,
}) => {
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<number[]>(targetIds);
  const rootRef = useRef<HTMLDivElement>(null);

  const bracketsById = useMemo(
    () => new Map(availableBrackets.map((column) => [column.side_action_id, column])),
    [availableBrackets]
  );

  useEffect(() => {
    if (open) {
      setDraftIds(targetIds);
    }
  }, [open, targetIds]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const addable = useMemo(
    () =>
      availableBrackets.filter(
        (column) => !draftIds.includes(column.side_action_id)
      ),
    [availableBrackets, draftIds]
  );

  const moveTarget = (index: number, direction: -1 | 1) => {
    setDraftIds((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const removeTarget = (targetId: number) => {
    setDraftIds((current) => current.filter((id) => id !== targetId));
  };

  const addTarget = (targetId: number) => {
    setDraftIds((current) => [...current, targetId]);
  };

  const saveOn = () => {
    if (draftIds.length === 0) return;
    onSave(true, draftIds);
    setOpen(false);
  };

  const saveOff = () => {
    onSave(false, []);
    setOpen(false);
  };

  if (availableBrackets.length === 0) {
    return null;
  }

  return (
    <div className="relative mt-1" ref={rootRef}>
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || pending}
        onClick={() => setOpen((current) => !current)}
        title="Roll unused tickets into other bracket sets (priority order)"
        aria-label={`Configure bracket rollover for ${bowlerName}`}
        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          enabled
            ? 'border-primary bg-primary text-white'
            : 'border-border text-text-muted hover:border-primary hover:text-primary'
        }`}
      >
        Roll
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 w-64 rounded-md border border-border bg-surface p-2 shadow-lg">
          <p className="mb-2 text-[11px] text-text-muted">
            Unused tickets try each set in order before refunding. Applies to all
            bracket entries on this squad.
          </p>
          {draftIds.length > 0 ? (
            <ol className="max-h-40 space-y-1 overflow-y-auto">
              {draftIds.map((targetId, index) => {
                const column = bracketsById.get(targetId);
                return (
                  <li
                    key={targetId}
                    className="flex items-center gap-1 rounded border border-border bg-surface-light px-1.5 py-1 text-xs"
                  >
                    <span className="w-4 shrink-0 text-[10px] text-text-muted">
                      {index + 1}.
                    </span>
                    <span className="min-w-0 flex-1 truncate text-text">
                      {column?.name ?? `Set ${targetId}`}
                    </span>
                    <button
                      type="button"
                      className="px-1 text-text-muted hover:text-text disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => moveTarget(index, -1)}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="px-1 text-text-muted hover:text-text disabled:opacity-30"
                      disabled={index === draftIds.length - 1}
                      onClick={() => moveTarget(index, 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="px-1 text-text-muted hover:text-danger"
                      onClick={() => removeTarget(targetId)}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-[11px] text-text-muted">Add bracket sets below.</p>
          )}
          {addable.length > 0 ? (
            <div className="mt-2">
              <label className="mb-1 block text-[11px] text-text-muted">
                Add target
              </label>
              <select
                className="w-full rounded border border-border bg-surface-light px-2 py-1 text-xs text-text"
                defaultValue=""
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && value > 0) {
                    addTarget(value);
                  }
                  event.target.value = '';
                }}
              >
                <option value="">Choose bracket set…</option>
                {addable.map((column) => (
                  <option key={column.side_action_id} value={column.side_action_id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="mt-2 flex justify-between gap-2">
            {enabled ? (
              <button
                type="button"
                className="text-[11px] text-text-muted hover:text-text"
                onClick={saveOff}
              >
                Turn off
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="rounded bg-primary px-2 py-0.5 text-[11px] font-semibold text-white disabled:opacity-40"
              disabled={draftIds.length === 0 || pending}
              onClick={saveOn}
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function isEligibleForSquadPool(
  row: RosterSideActionSignupRow,
  column: RosterSideActionColumn,
  squadId: number
): boolean {
  const cell = row.signups[String(column.side_action_id)];
  const poolCell = cell?.pools?.find((candidate) => candidate.squad_id === squadId);
  return Boolean(poolCell?.is_eligible);
}

export function eligibleBracketSetsForSquad(
  columns: RosterSideActionColumn[],
  squadId: number,
  row?: RosterSideActionSignupRow,
  entryUnit: 'bowler' | 'team' = 'bowler'
): RosterSideActionColumn[] {
  const normalizedUnit = entryUnit === 'team' ? 'team' : 'bowler';
  return columns.filter(
    (column) =>
      column.side_action_type.toLowerCase() === 'bracket' &&
      (column.entry_unit === 'team' ? 'team' : 'bowler') === normalizedUnit &&
      column.pools.some((candidate) => candidate.squad_id === squadId) &&
      (row == null || isEligibleForSquadPool(row, column, squadId))
  );
}

export default RosterRolloverControl;
