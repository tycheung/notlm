import React, { useMemo } from 'react';
import Button from '../common/Button';
import Label from '../common/Label';
import type { PrizeAllocationMode, PrizeAllocationStep } from '../../types/event';
import { autoFillSingleUnknownValue, resolvePrizeAllocationSteps } from '../../utils/prizeAllocationResolve';

export type EditableStep = {
  place: string;
  placeEnd: string;
  mode: PrizeAllocationMode;
  value: string;
};

const MODE_OPTIONS: { value: PrizeAllocationMode; label: string }[] = [
  { value: 'fixed_amount', label: 'Fixed $' },
  { value: 'percent_of_slice', label: '% of node slice' },
  { value: 'percent_of_remainder', label: '% of remainder' },
  { value: 'remainder', label: 'Remainder' },
];

export function stepsToEditable(steps: PrizeAllocationStep[]): EditableStep[] {
  if (!steps?.length) return [{ place: '1', placeEnd: '', mode: 'percent_of_slice', value: '50' }];
  return steps.map((s) => ({
    place: String(s.place),
    placeEnd: s.place_end != null && s.place_end !== s.place ? String(s.place_end) : '',
    mode: s.mode,
    value: s.mode === 'remainder' ? '' : s.value != null ? String(s.value) : '',
  }));
}

export function editableToSteps(rows: EditableStep[]): PrizeAllocationStep[] {
  return rows.map((r) => {
    const place = Math.max(1, parseInt(r.place, 10) || 1);
    const peRaw = r.placeEnd.trim();
    const place_end =
      peRaw !== '' ? Math.max(1, parseInt(peRaw, 10) || place) : undefined;
    const step: PrizeAllocationStep = {
      place,
      mode: r.mode,
    };
    if (place_end != null && place_end !== place) {
      step.place_end = place_end;
    }
    if (r.mode !== 'remainder') {
      const v = parseFloat(r.value);
      if (!Number.isNaN(v)) step.value = v;
    }
    return step;
  });
}

function parseStepsForAuto(rows: EditableStep[]): PrizeAllocationStep[] {
  return rows.map((r) => {
    const place = Math.max(1, parseInt(r.place, 10) || 1);
    const peRaw = r.placeEnd.trim();
    const place_end =
      peRaw !== '' ? Math.max(1, parseInt(peRaw, 10) || place) : undefined;
    const step: PrizeAllocationStep = { place, mode: r.mode };
    if (place_end != null && place_end !== place) step.place_end = place_end;
    if (r.mode !== 'remainder') {
      const t = r.value.trim();
      if (t === '') {
        step.value = undefined;
      } else {
        const v = parseFloat(t);
        if (!Number.isNaN(v)) step.value = v;
      }
    }
    return step;
  });
}

export interface PrizeAllocationStepsEditorProps {
  placementCount: number;
  /** Node slice S for preview + auto calculate */
  slicePreview: number;
  rows: EditableStep[];
  onRowsChange: (rows: EditableStep[]) => void;
}

const PrizeAllocationStepsEditor: React.FC<PrizeAllocationStepsEditorProps> = ({
  placementCount,
  slicePreview,
  rows,
  onRowsChange,
}) => {
  const n = Math.max(1, Math.min(64, placementCount));
  const parsedForAuto = useMemo(() => parseStepsForAuto(rows), [rows]);
  const autoResult = useMemo(
    () => autoFillSingleUnknownValue(parsedForAuto, slicePreview, n),
    [parsedForAuto, slicePreview, n]
  );
  const preview = useMemo(() => {
    const { amounts, error } = resolvePrizeAllocationSteps(parsedForAuto, slicePreview, n);
    return { amounts, error };
  }, [parsedForAuto, slicePreview, n]);

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[idx], next[j]] = [next[j], next[idx]];
    onRowsChange(next);
  };

  const addRow = () => {
    onRowsChange([
      ...rows,
      { place: String(Math.min(n, rows.length + 1)), placeEnd: '', mode: 'fixed_amount', value: '0' },
    ]);
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    onRowsChange(rows.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, patch: Partial<EditableStep>) => {
    onRowsChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const applyAuto = () => {
    if (!autoResult) return;
    const next = [...rows];
    const r = next[autoResult.index];
    next[autoResult.index] = { ...r, value: String(autoResult.value) };
    onRowsChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label>Ordered payout steps</Label>
        <Button type="button" variant="lightbackground" size="small" onClick={addRow}>
          + Add step
        </Button>
      </div>
      <p className="text-xs text-text-muted">
        Steps run in order. Use <strong>Remainder</strong> to assign what is left after earlier steps.
      </p>

      {rows.map((row, idx) => {
        const showAutoHere = autoResult?.index === idx;
        return (
          <div
            key={idx}
            className="flex flex-wrap items-end gap-2 rounded-md border border-border/80 bg-surface-light p-2"
          >
            <div className="flex gap-1">
              <Button
                type="button"
                variant="lightbackground"
                size="small"
                disabled={idx === 0}
                onClick={() => move(idx, -1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="lightbackground"
                size="small"
                disabled={idx === rows.length - 1}
                onClick={() => move(idx, 1)}
              >
                ↓
              </Button>
            </div>
            <div>
              <label className="text-xs text-text-muted block">Place</label>
              <input
                type="number"
                min={1}
                max={n}
                value={row.place}
                onChange={(e) => updateRow(idx, { place: e.target.value })}
                className="w-14 rounded border border-border bg-surface px-1 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block">To</label>
              <input
                type="number"
                min={1}
                max={n}
                placeholder="—"
                value={row.placeEnd}
                onChange={(e) => updateRow(idx, { placeEnd: e.target.value })}
                className="w-14 rounded border border-border bg-surface px-1 py-1 text-sm"
              />
            </div>
            <div className="min-w-[10rem]">
              <label className="text-xs text-text-muted block">Mode</label>
              <select
                value={row.mode}
                onChange={(e) =>
                  updateRow(idx, {
                    mode: e.target.value as PrizeAllocationMode,
                    value: e.target.value === 'remainder' ? '' : row.value,
                  })
                }
                className="w-full rounded border border-border bg-surface px-1 py-1 text-sm"
              >
                {MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {row.mode !== 'remainder' && (
              <div className="flex items-end gap-1">
                <div>
                  <label className="text-xs text-text-muted block">Value</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.value}
                    onChange={(e) => updateRow(idx, { value: e.target.value })}
                    className="w-24 rounded border border-border bg-surface px-1 py-1 text-sm"
                  />
                </div>
                {showAutoHere && (
                  <Button type="button" variant="darkbackground" size="small" onClick={applyAuto}>
                    Auto calculate
                  </Button>
                )}
              </div>
            )}
            <Button
              type="button"
              variant="lightbackground"
              size="small"
              className="ml-auto text-red-600"
              disabled={rows.length <= 1}
              onClick={() => removeRow(idx)}
            >
              Remove
            </Button>
          </div>
        );
      })}

      <div className="text-xs text-text-muted rounded border border-border/60 p-2 space-y-1">
        <div>
          <span className="font-medium text-text">Preview </span>
          (slice ${slicePreview.toFixed(2)}):
        </div>
        {preview.error ? (
          <span className="text-amber-700">{preview.error}</span>
        ) : (
          <ul className="list-disc pl-4">
            {Object.entries(preview.amounts).map(([k, v]) => (
              <li key={k}>
                Place {k}: ${v.toFixed(2)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PrizeAllocationStepsEditor;
